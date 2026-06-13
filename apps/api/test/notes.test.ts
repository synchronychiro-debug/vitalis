import { describe, it, expect, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  closeApp,
  resetDb,
  seedClinicWithAdmin,
  createClient,
  createUser,
  tokenFor,
  auth,
} from "./helpers";
import { UserRole, AppointmentType, AppointmentStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

async function createPatient(clinicId: string, clientId: string) {
  return prisma.patient.create({
    data: {
      clinicId,
      clientId,
      name: "Buddy",
      species: "CANINE",
      chiefComplaint: "Back pain",
      chiefComplaintStatus: "UNCHANGED",
    },
  });
}

async function createAppointment(clinicId: string, patientId: string, clientId: string, providerId: string) {
  return prisma.appointment.create({
    data: {
      clinicId,
      patientId,
      clientId,
      providerId,
      type: AppointmentType.ROUTINE_ADJUSTMENT,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date(),
      duration: 30,
    },
  });
}

describe("clinical notes", () => {
  let app: FastifyInstance;
  let clinicId: string;
  let adminToken: string;
  let providerToken: string;
  let providerId: string;
  let patientId: string;
  let clientId: string;

  afterAll(() => closeApp());

  beforeEach(async () => {
    await resetDb();
    const seed = await seedClinicWithAdmin();
    app = seed.app;
    clinicId = seed.clinic.id;
    adminToken = seed.token;

    const provider = await createUser(clinicId, UserRole.PROVIDER);
    providerId = provider.id;
    providerToken = await tokenFor(app, clinicId, provider.email);

    const client = await createClient(clinicId);
    clientId = client.id;

    const patient = await createPatient(clinicId, clientId);
    patientId = patient.id;
  });

  it("creates a SOAP note for an appointment", async () => {
    const apt = await createAppointment(clinicId, patientId, clientId, providerId);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: {
        appointmentId: apt.id,
        subjective: "Owner reports improvement in mobility",
        objective: "Decreased muscle tension in lumbar region",
        assessment: "Responding well to adjustments",
        plan: "Continue weekly adjustments for 4 more weeks",
      },
    });

    expect(res.statusCode).toBe(201);
    const { data } = res.json();
    expect(data.status).toBe("DRAFT");
    expect(data.subjective).toContain("improvement");
    expect(data.provider.id).toBe(providerId);
  });

  it("prevents duplicate notes for the same appointment", async () => {
    const apt = await createAppointment(clinicId, patientId, clientId, providerId);

    await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: { appointmentId: apt.id, subjective: "First note" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: { appointmentId: apt.id, subjective: "Duplicate" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("follows the sign → lock lifecycle", async () => {
    const apt = await createAppointment(clinicId, patientId, clientId, providerId);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: { appointmentId: apt.id, subjective: "Test note" },
    });
    const noteId = createRes.json().data.id;

    // Sign
    const signRes = await app.inject({
      method: "POST",
      url: `/api/v1/notes/${noteId}/sign`,
      headers: auth(providerToken),
    });
    expect(signRes.json().data.status).toBe("SIGNED");
    expect(signRes.json().data.signedAt).toBeTruthy();

    // Can't edit signed note
    const editRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/notes/${noteId}`,
      headers: auth(providerToken),
      payload: { subjective: "Trying to edit" },
    });
    expect(editRes.statusCode).toBe(400);

    // Lock
    const lockRes = await app.inject({
      method: "POST",
      url: `/api/v1/notes/${noteId}/lock`,
      headers: auth(providerToken),
    });
    expect(lockRes.json().data.status).toBe("LOCKED");
    expect(lockRes.json().data.lockedAt).toBeTruthy();
  });

  it("supports addendums on signed notes", async () => {
    const apt = await createAppointment(clinicId, patientId, clientId, providerId);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: { appointmentId: apt.id, subjective: "Original" },
    });
    const noteId = createRes.json().data.id;

    // Can't add addendum to draft
    const draftAddendum = await app.inject({
      method: "POST",
      url: `/api/v1/notes/${noteId}/addendums`,
      headers: auth(providerToken),
      payload: { content: "Too early" },
    });
    expect(draftAddendum.statusCode).toBe(400);

    // Sign, then add addendum
    await app.inject({
      method: "POST",
      url: `/api/v1/notes/${noteId}/sign`,
      headers: auth(providerToken),
    });

    const addRes = await app.inject({
      method: "POST",
      url: `/api/v1/notes/${noteId}/addendums`,
      headers: auth(providerToken),
      payload: { content: "Patient called — feeling much better today" },
    });
    expect(addRes.statusCode).toBe(201);
    expect(addRes.json().data.content).toContain("much better");
  });

  it("updates the patient chief complaint status", async () => {
    const apt = await createAppointment(clinicId, patientId, clientId, providerId);

    await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: {
        appointmentId: apt.id,
        subjective: "Feeling better",
        chiefComplaintUpdate: "IMPROVED",
      },
    });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    expect(patient?.chiefComplaintStatus).toBe("IMPROVED");
  });

  it("supports SALT — copying from a prior note", async () => {
    const apt1 = await createAppointment(clinicId, patientId, clientId, providerId);
    const create1 = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: {
        appointmentId: apt1.id,
        subjective: "First visit findings",
        objective: "Palpation reveals tension at T12-L1",
      },
    });
    const sourceNoteId = create1.json().data.id;

    // Get SALT list
    const saltRes = await app.inject({
      method: "GET",
      url: `/api/v1/notes/salt/${patientId}`,
      headers: auth(providerToken),
    });
    expect(saltRes.json().data).toHaveLength(1);

    // Create new note referencing the source
    const apt2 = await createAppointment(clinicId, patientId, clientId, providerId);
    const create2 = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: auth(providerToken),
      payload: {
        appointmentId: apt2.id,
        subjective: "First visit findings",
        objective: "Palpation reveals tension at T12-L1",
        saltSourceNoteId: sourceNoteId,
      },
    });
    expect(create2.statusCode).toBe(201);
    expect(create2.json().data.saltSourceNoteId).toBe(sourceNoteId);
  });
});

describe("macros", () => {
  let app: FastifyInstance;
  let clinicId: string;
  let providerToken: string;

  afterAll(() => closeApp());

  beforeEach(async () => {
    await resetDb();
    const seed = await seedClinicWithAdmin();
    app = seed.app;
    clinicId = seed.clinic.id;

    const provider = await createUser(clinicId, UserRole.PROVIDER);
    providerToken = await tokenFor(app, clinicId, provider.email);
  });

  it("creates and lists macros", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/macros",
      headers: auth(providerToken),
      payload: {
        title: "Standard Lumbar Exam",
        soapSection: "OBJECTIVE",
        body: "Palpation of {{region}} reveals {{finding}}",
        variables: [
          { placeholder: "region", type: "ANATOMICAL", options: ["Cervical", "Thoracic", "Lumbar", "Sacral"] },
          { placeholder: "finding", type: "CHOICE", options: ["normal tone", "increased tone", "decreased tone", "tenderness"] },
        ],
      },
    });
    expect(res.statusCode).toBe(201);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/macros?soapSection=OBJECTIVE",
      headers: auth(providerToken),
    });
    expect(listRes.json().data).toHaveLength(1);
    expect(listRes.json().data[0].title).toBe("Standard Lumbar Exam");
  });
});
