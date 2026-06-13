import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AppointmentType, AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError } from "../lib/errors.js";
import { idParam, paginationQuery } from "../schemas/common.js";

const staff = requireRole("SUPER_ADMIN", "ADMIN", "PROVIDER", "STAFF");

const include = {
  patient: { select: { id: true, name: true, species: true } },
  client: { select: { id: true, firstName: true, lastName: true } },
  provider: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function appointmentRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    {
      preHandler: [requireAuth],
      schema: {
        tags: ["appointments"],
        querystring: paginationQuery.extend({
          providerId: z.string().uuid().optional(),
          patientId: z.string().uuid().optional(),
          status: z.nativeEnum(AppointmentStatus).optional(),
          from: z.coerce.date().optional(),
          to: z.coerce.date().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId, role, userId } = getAuthUser(request);
      const { page = 1, limit = 25, providerId, patientId, status, from, to } =
        request.query;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { clinicId };
      if (providerId) where["providerId"] = providerId;
      if (patientId) where["patientId"] = patientId;
      if (status) where["status"] = status;
      if (from || to) {
        where["scheduledAt"] = {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        };
      }

      // Providers and staff may view the full clinic schedule (and narrow it
      // with ?providerId=). Clients only see their own animals' appointments.
      if (role === "CLIENT") {
        const client = await prisma.client.findFirst({
          where: { clinicId, userId },
        });
        where["clientId"] = client?.id ?? "__none__";
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledAt: "asc" },
          include,
        }),
        prisma.appointment.count({ where }),
      ]);

      return {
        success: true,
        data: appointments,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },
  );

  app.get(
    "/:id",
    {
      preHandler: [requireAuth],
      schema: { tags: ["appointments"], params: idParam },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const appointment = await prisma.appointment.findFirst({
        where: { id: request.params.id, clinicId },
        include,
      });
      if (!appointment) throw new NotFoundError("Appointment");
      return { success: true, data: appointment };
    },
  );

  app.post(
    "/",
    {
      preHandler: [staff],
      schema: {
        tags: ["appointments"],
        body: z.object({
          patientId: z.string().uuid(),
          providerId: z.string().uuid(),
          type: z.nativeEnum(AppointmentType).default(AppointmentType.ROUTINE_ADJUSTMENT),
          status: z.nativeEnum(AppointmentStatus).optional(),
          scheduledAt: z.coerce.date(),
          duration: z.number().int().positive().max(600).optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);
      const body = request.body;

      // Patient and provider must belong to the same clinic. Derive clientId
      // from the patient so an appointment can't be linked to the wrong owner.
      const patient = await prisma.patient.findFirst({
        where: { id: body.patientId, clinicId },
      });
      if (!patient) throw new NotFoundError("Patient");

      const provider = await prisma.user.findFirst({
        where: { id: body.providerId, clinicId },
      });
      if (!provider) throw new NotFoundError("Provider");

      const appointment = await prisma.appointment.create({
        data: {
          clinicId,
          patientId: patient.id,
          clientId: patient.clientId,
          providerId: provider.id,
          type: body.type,
          status: body.status ?? AppointmentStatus.CONFIRMED,
          scheduledAt: body.scheduledAt,
          duration: body.duration ?? 30,
          location: body.location,
          notes: body.notes,
        },
        include,
      });

      await recordAudit({
        clinicId,
        userId,
        action: "appointment.create",
        entityType: "Appointment",
        entityId: appointment.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: appointment });
    },
  );

  app.patch(
    "/:id",
    {
      preHandler: [staff],
      schema: {
        tags: ["appointments"],
        params: idParam,
        body: z.object({
          providerId: z.string().uuid().optional(),
          type: z.nativeEnum(AppointmentType).optional(),
          status: z.nativeEnum(AppointmentStatus).optional(),
          scheduledAt: z.coerce.date().optional(),
          duration: z.number().int().positive().max(600).optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
          cancellationReason: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.appointment.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Appointment");

      const wasCompleted = existing.status === AppointmentStatus.COMPLETED;
      const appointment = await prisma.appointment.update({
        where: { id: existing.id },
        data: request.body,
        include,
      });

      // Completing an appointment advances the patient's visit counter.
      if (
        !wasCompleted &&
        request.body.status === AppointmentStatus.COMPLETED
      ) {
        await prisma.patient.update({
          where: { id: existing.patientId },
          data: { totalVisits: { increment: 1 } },
        });
      }

      await recordAudit({
        clinicId,
        userId,
        action: "appointment.update",
        entityType: "Appointment",
        entityId: appointment.id,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: appointment };
    },
  );
}
