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

describe("patients", () => {
  beforeEach(resetDb);
  afterAll(closeApp);

  async function setup() {
    const app = await getApp();
    const clinic = await createClinic();
    const admin = await createUser(clinic.id, UserRole.ADMIN);
    const client = await createClient(clinic.id);
    const token = await tokenFor(app, clinic.id, admin.email);
    return { app, clinic, admin, client, token };
  }

  it("creates a patient", async () => {
    const { app, client, token } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: {
        clientId: client.id,
        name: "Max",
        species: "CANINE",
        breed: "Shepherd",
        currentWeight: 30.5,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe("Max");
    expect(res.json().data.totalVisits).toBe(0);
  });

  it("rejects an invalid species", async () => {
    const { app, client, token } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: { clientId: client.id, name: "Max", species: "dragon" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("404s when creating a patient for a non-existent client", async () => {
    const { app, token } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: {
        clientId: "00000000-0000-0000-0000-000000000000",
        name: "Ghost",
        species: "FELINE",
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lists and filters patients by species", async () => {
    const { app, client, token } = await setup();
    for (const [name, species] of [
      ["Max", "CANINE"],
      ["Whiskers", "FELINE"],
    ]) {
      await app.inject({
        method: "POST",
        url: "/api/v1/patients",
        headers: auth(token),
        payload: { clientId: client.id, name, species },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/patients?species=FELINE",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
    expect(res.json().meta.total).toBe(1);
  });

  it("restricts a CLIENT user to their own animals", async () => {
    const { app, clinic, client, token } = await setup();
    // Patient belonging to the portal client.
    const clientUser = await createUser(clinic.id, UserRole.CLIENT);
    await (await import("../src/lib/prisma.js")).prisma.client.update({
      where: { id: client.id },
      data: { userId: clientUser.id },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: { clientId: client.id, name: "Mine", species: "CANINE" },
    });

    // A different client's animal in the same clinic.
    const other = await createClient(clinic.id);
    await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: { clientId: other.id, name: "NotMine", species: "CANINE" },
    });

    const clientToken = await tokenFor(app, clinic.id, clientUser.email);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/patients",
      headers: auth(clientToken),
    });
    expect(res.statusCode).toBe(200);
    const names = res.json().data.map((p: { name: string }) => p.name);
    expect(names).toEqual(["Mine"]);
  });

  it("isolates patients across clinics", async () => {
    const { app, client, token } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: { clientId: client.id, name: "Max", species: "CANINE" },
    });
    const patientId = created.json().data.id;

    // A second clinic's admin must not see it.
    const otherClinic = await createClinic("Other");
    const otherAdmin = await createUser(otherClinic.id, UserRole.ADMIN);
    const otherToken = await tokenFor(app, otherClinic.id, otherAdmin.email);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${patientId}`,
      headers: auth(otherToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it("soft-deletes a patient and excludes it from queries", async () => {
    const { app, client, token } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: { clientId: client.id, name: "Shadow", species: "FELINE" },
    });
    const id = created.json().data.id;

    // Soft-delete via direct Prisma (simulating a future DELETE endpoint)
    const { prisma } = await import("../src/lib/prisma.js");
    await prisma.patient.delete({ where: { id } });

    // Patient should not appear in list
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/patients",
      headers: auth(token),
    });
    expect(list.json().data.every((p: { id: string }) => p.id !== id)).toBe(true);

    // GET by ID should also 404
    const get = await app.inject({
      method: "GET",
      url: `/api/v1/patients/${id}`,
      headers: auth(token),
    });
    expect(get.statusCode).toBe(404);
  });

  it("updates a patient's chief complaint status", async () => {
    const { app, client, token } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/patients",
      headers: auth(token),
      payload: { clientId: client.id, name: "Max", species: "CANINE" },
    });
    const id = created.json().data.id;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/patients/${id}`,
      headers: auth(token),
      payload: { chiefComplaintStatus: "IMPROVED" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.chiefComplaintStatus).toBe("IMPROVED");
  });
});
