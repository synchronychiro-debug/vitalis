import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { UserRole } from "@prisma/client";
import {
  getApp,
  closeApp,
  resetDb,
  createClinic,
  createUser,
  createClient,
  tokenFor,
  auth,
} from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

async function setup() {
  const app = await getApp();
  const clinic = await createClinic();
  const admin = await createUser(clinic.id, UserRole.ADMIN);
  const provider = await createUser(clinic.id, UserRole.PROVIDER);
  const client = await createClient(clinic.id);
  const patient = await prisma.patient.create({
    data: { clinicId: clinic.id, clientId: client.id, name: "Max", species: "CANINE" },
  });
  const token = await tokenFor(app, clinic.id, admin.email);
  return { app, clinic, admin, provider, client, patient, token };
}

describe("appointments", () => {
  beforeEach(resetDb);
  afterAll(closeApp);

  it("creates an appointment and derives the client from the patient", async () => {
    const { app, provider, patient, client, token } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/appointments",
      headers: auth(token),
      payload: {
        patientId: patient.id,
        providerId: provider.id,
        type: "INITIAL_EVAL",
        scheduledAt: "2026-07-01T15:00:00.000Z",
        duration: 60,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.clientId).toBe(client.id);
    expect(res.json().data.status).toBe("CONFIRMED");
  });

  it("increments the patient's visit count when completed", async () => {
    const { app, provider, patient, token } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/appointments",
      headers: auth(token),
      payload: {
        patientId: patient.id,
        providerId: provider.id,
        scheduledAt: "2026-07-01T15:00:00.000Z",
      },
    });
    const id = created.json().data.id;

    await app.inject({
      method: "PATCH",
      url: `/api/v1/appointments/${id}`,
      headers: auth(token),
      payload: { status: "COMPLETED" },
    });

    const fresh = await prisma.patient.findUnique({ where: { id: patient.id } });
    expect(fresh?.totalVisits).toBe(1);

    // Editing an already-completed appointment must not double-count.
    await app.inject({
      method: "PATCH",
      url: `/api/v1/appointments/${id}`,
      headers: auth(token),
      payload: { status: "COMPLETED", notes: "follow-up" },
    });
    const again = await prisma.patient.findUnique({ where: { id: patient.id } });
    expect(again?.totalVisits).toBe(1);
  });

  it("filters appointments by date range", async () => {
    const { app, provider, patient, token } = await setup();
    for (const when of ["2026-07-01T10:00:00Z", "2026-08-01T10:00:00Z"]) {
      await app.inject({
        method: "POST",
        url: "/api/v1/appointments",
        headers: auth(token),
        payload: { patientId: patient.id, providerId: provider.id, scheduledAt: when },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/appointments?from=2026-07-15T00:00:00Z&to=2026-08-15T00:00:00Z",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });

  it("404s when the provider is not in the clinic", async () => {
    const { app, patient, token } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/appointments",
      headers: auth(token),
      payload: {
        patientId: patient.id,
        providerId: "00000000-0000-0000-0000-000000000000",
        scheduledAt: "2026-07-01T15:00:00Z",
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lets a provider see the full clinic schedule and filter to their own", async () => {
    const { app, clinic, provider, patient, token } = await setup();
    const otherProvider = await createUser(clinic.id, UserRole.PROVIDER);

    await app.inject({
      method: "POST",
      url: "/api/v1/appointments",
      headers: auth(token),
      payload: { patientId: patient.id, providerId: provider.id, scheduledAt: "2026-07-01T10:00:00Z" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/appointments",
      headers: auth(token),
      payload: { patientId: patient.id, providerId: otherProvider.id, scheduledAt: "2026-07-02T10:00:00Z" },
    });

    const providerToken = await tokenFor(app, clinic.id, provider.email);

    // Full clinic schedule.
    const all = await app.inject({
      method: "GET",
      url: "/api/v1/appointments",
      headers: auth(providerToken),
    });
    expect(all.json().data).toHaveLength(2);

    // Narrowed to just their own.
    const mine = await app.inject({
      method: "GET",
      url: `/api/v1/appointments?providerId=${provider.id}`,
      headers: auth(providerToken),
    });
    expect(mine.json().data).toHaveLength(1);
    expect(mine.json().data[0].provider.id).toBe(provider.id);
  });
});
