import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ChiefComplaintStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError, AppError } from "../lib/errors.js";
import { idParam, paginationQuery } from "../schemas/common.js";
import { resolvePage, pageMeta } from "../lib/pagination.js";

const providerPlus = requireRole("SUPER_ADMIN", "ADMIN", "PROVIDER");

const noteInclude = {
  provider: { select: { id: true, firstName: true, lastName: true } },
  patient: { select: { id: true, name: true, species: true, chiefComplaint: true, chiefComplaintStatus: true } },
  appointment: { select: { id: true, scheduledAt: true, type: true } },
  addendums: {
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function noteRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // List notes for a patient
  app.get(
    "/",
    {
      preHandler: [requireAuth],
      schema: {
        tags: ["notes"],
        querystring: paginationQuery.extend({
          patientId: z.string().uuid().optional(),
          providerId: z.string().uuid().optional(),
          status: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const { patientId, providerId, status } = request.query;
      const { page, limit, skip } = resolvePage(request.query);

      const where: Record<string, unknown> = { clinicId };
      if (patientId) where["patientId"] = patientId;
      if (providerId) where["providerId"] = providerId;
      if (status) where["status"] = status;

      const [notes, total] = await Promise.all([
        prisma.clinicalNote.findMany({
          where,
          include: noteInclude,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.clinicalNote.count({ where }),
      ]);

      return { success: true, data: notes, meta: pageMeta(total, page, limit) };
    },
  );

  // Get single note
  app.get(
    "/:id",
    {
      preHandler: [requireAuth],
      schema: { tags: ["notes"], params: idParam },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const note = await prisma.clinicalNote.findFirst({
        where: { id: request.params.id, clinicId },
        include: {
          ...noteInclude,
          saltSource: { select: { id: true, createdAt: true, appointment: { select: { scheduledAt: true } } } },
        },
      });
      if (!note) throw new NotFoundError("Clinical note");
      return { success: true, data: note };
    },
  );

  // Create note for an appointment
  app.post(
    "/",
    {
      preHandler: [providerPlus],
      schema: {
        tags: ["notes"],
        body: z.object({
          appointmentId: z.string().uuid(),
          subjective: z.string().optional(),
          objective: z.string().optional(),
          assessment: z.string().optional(),
          plan: z.string().optional(),
          chiefComplaintUpdate: z.nativeEnum(ChiefComplaintStatus).optional(),
          saltSourceNoteId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);
      const { appointmentId, saltSourceNoteId, chiefComplaintUpdate, ...soapFields } = request.body;

      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, clinicId },
      });
      if (!appointment) throw new NotFoundError("Appointment");

      const existing = await prisma.clinicalNote.findUnique({
        where: { appointmentId },
      });
      if (existing) throw new AppError(409, "A note already exists for this appointment");

      if (saltSourceNoteId) {
        const source = await prisma.clinicalNote.findFirst({
          where: { id: saltSourceNoteId, clinicId },
        });
        if (!source) throw new NotFoundError("SALT source note");
      }

      const note = await prisma.clinicalNote.create({
        data: {
          clinicId,
          appointmentId,
          patientId: appointment.patientId,
          providerId: userId,
          saltSourceNoteId: saltSourceNoteId ?? null,
          chiefComplaintUpdate: chiefComplaintUpdate ?? null,
          ...soapFields,
        },
        include: noteInclude,
      });

      if (chiefComplaintUpdate) {
        await prisma.patient.update({
          where: { id: appointment.patientId },
          data: { chiefComplaintStatus: chiefComplaintUpdate },
        });
      }

      await recordAudit({
        clinicId,
        userId,
        action: "note.create",
        entityType: "ClinicalNote",
        entityId: note.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: note });
    },
  );

  // Update a draft note
  app.patch(
    "/:id",
    {
      preHandler: [providerPlus],
      schema: {
        tags: ["notes"],
        params: idParam,
        body: z.object({
          subjective: z.string().optional(),
          objective: z.string().optional(),
          assessment: z.string().optional(),
          plan: z.string().optional(),
          chiefComplaintUpdate: z.nativeEnum(ChiefComplaintStatus).optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.clinicalNote.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Clinical note");
      if (existing.status !== "DRAFT") {
        throw new AppError(400, "Only draft notes can be edited. Use addendums for signed notes.");
      }

      const { chiefComplaintUpdate, ...soapFields } = request.body;

      const note = await prisma.clinicalNote.update({
        where: { id: existing.id },
        data: {
          ...soapFields,
          ...(chiefComplaintUpdate ? { chiefComplaintUpdate } : {}),
        },
        include: noteInclude,
      });

      if (chiefComplaintUpdate) {
        await prisma.patient.update({
          where: { id: existing.patientId },
          data: { chiefComplaintStatus: chiefComplaintUpdate },
        });
      }

      await recordAudit({
        clinicId,
        userId,
        action: "note.update",
        entityType: "ClinicalNote",
        entityId: note.id,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: note };
    },
  );

  // Sign a note
  app.post(
    "/:id/sign",
    {
      preHandler: [providerPlus],
      schema: { tags: ["notes"], params: idParam },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const note = await prisma.clinicalNote.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!note) throw new NotFoundError("Clinical note");
      if (note.status !== "DRAFT") throw new AppError(400, "Note is already signed");

      const updated = await prisma.clinicalNote.update({
        where: { id: note.id },
        data: { status: "SIGNED", signedAt: new Date() },
        include: noteInclude,
      });

      await recordAudit({
        clinicId,
        userId,
        action: "note.sign",
        entityType: "ClinicalNote",
        entityId: note.id,
        ipAddress: request.ip,
      });

      return { success: true, data: updated };
    },
  );

  // Lock a signed note
  app.post(
    "/:id/lock",
    {
      preHandler: [providerPlus],
      schema: { tags: ["notes"], params: idParam },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const note = await prisma.clinicalNote.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!note) throw new NotFoundError("Clinical note");
      if (note.status !== "SIGNED") throw new AppError(400, "Note must be signed before locking");

      const updated = await prisma.clinicalNote.update({
        where: { id: note.id },
        data: { status: "LOCKED", lockedAt: new Date() },
        include: noteInclude,
      });

      await recordAudit({
        clinicId,
        userId,
        action: "note.lock",
        entityType: "ClinicalNote",
        entityId: note.id,
        ipAddress: request.ip,
      });

      return { success: true, data: updated };
    },
  );

  // Add addendum to a signed/locked note
  app.post(
    "/:id/addendums",
    {
      preHandler: [providerPlus],
      schema: {
        tags: ["notes"],
        params: idParam,
        body: z.object({
          content: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);
      const note = await prisma.clinicalNote.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!note) throw new NotFoundError("Clinical note");
      if (note.status === "DRAFT") throw new AppError(400, "Sign the note before adding addendums");
      if (note.status === "VOIDED") throw new AppError(400, "Cannot add addendums to a voided note");

      const addendum = await prisma.noteAddendum.create({
        data: {
          noteId: note.id,
          authorId: userId,
          content: request.body.content,
        },
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "note.addendum",
        entityType: "ClinicalNote",
        entityId: note.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: addendum });
    },
  );

  // SALT — get prior notes for a patient to copy from
  app.get(
    "/salt/:patientId",
    {
      preHandler: [providerPlus],
      schema: {
        tags: ["notes"],
        params: z.object({ patientId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const notes = await prisma.clinicalNote.findMany({
        where: { clinicId, patientId: request.params.patientId },
        include: {
          provider: { select: { id: true, firstName: true, lastName: true } },
          appointment: { select: { id: true, scheduledAt: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return { success: true, data: notes };
    },
  );
}
