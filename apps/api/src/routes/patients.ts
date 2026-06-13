import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  Species,
  AnimalSex,
  PatientStatus,
  ChiefComplaintStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError } from "../lib/errors.js";
import { idParam, paginationQuery } from "../schemas/common.js";

const patientCore = {
  name: z.string().min(1),
  breed: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  sex: z.nativeEnum(AnimalSex).optional(),
  color: z.string().optional(),
  currentWeight: z.number().positive().optional(),
  microchipId: z.string().optional(),
  primaryVetName: z.string().optional(),
  primaryVetClinic: z.string().optional(),
  primaryVetPhone: z.string().optional(),
  primaryVetEmail: z.string().email().optional(),
  shareNotesWithVet: z.boolean().optional(),
  treatmentGoals: z.string().optional(),
  estimatedTotalVisits: z.number().int().positive().optional(),
  chiefComplaint: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  priorConditions: z.string().optional(),
};

const createBody = z.object({
  clientId: z.string().uuid(),
  species: z.nativeEnum(Species),
  ...patientCore,
});

const updateBody = z.object({
  species: z.nativeEnum(Species).optional(),
  status: z.nativeEnum(PatientStatus).optional(),
  deceasedDate: z.coerce.date().optional(),
  chiefComplaintStatus: z.nativeEnum(ChiefComplaintStatus).optional(),
  ...patientCore,
  name: z.string().min(1).optional(),
});

// Patients can be created/edited by clinical/admin staff but not clients.
const staffWrite = requireRole("SUPER_ADMIN", "ADMIN", "PROVIDER", "STAFF");

/** Restricts a CLIENT user to their own animals; staff/providers see all. */
async function scopeForRole(
  clinicId: string,
  role: string,
  userId: string,
): Promise<Record<string, unknown>> {
  if (role !== "CLIENT") return { clinicId };
  const client = await prisma.client.findFirst({ where: { clinicId, userId } });
  return { clinicId, clientId: client?.id ?? "__none__" };
}

export async function patientRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    {
      preHandler: [requireAuth],
      schema: {
        tags: ["patients"],
        querystring: paginationQuery.extend({
          species: z.nativeEnum(Species).optional(),
          status: z.nativeEnum(PatientStatus).optional(),
          clientId: z.string().uuid().optional(),
          search: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId, role, userId } = getAuthUser(request);
      const { page = 1, limit = 25, species, status, clientId, search } =
        request.query;
      const skip = (page - 1) * limit;

      const where = await scopeForRole(clinicId, role, userId);
      if (species) where["species"] = species;
      if (status) where["status"] = status;
      if (clientId && role !== "CLIENT") where["clientId"] = clientId;
      if (search) where["name"] = { contains: search, mode: "insensitive" };

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
          include: {
            client: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        prisma.patient.count({ where }),
      ]);

      return {
        success: true,
        data: patients,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },
  );

  app.get(
    "/:id",
    { preHandler: [requireAuth], schema: { tags: ["patients"], params: idParam } },
    async (request) => {
      const { clinicId, role, userId } = getAuthUser(request);
      const where = await scopeForRole(clinicId, role, userId);
      const patient = await prisma.patient.findFirst({
        where: { ...where, id: request.params.id },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          weightHistory: { orderBy: { recordedAt: "desc" }, take: 10 },
        },
      });
      if (!patient) throw new NotFoundError("Patient");
      return { success: true, data: patient };
    },
  );

  app.post(
    "/",
    {
      preHandler: [staffWrite],
      schema: { tags: ["patients"], body: createBody },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);

      const client = await prisma.client.findFirst({
        where: { id: request.body.clientId, clinicId },
      });
      if (!client) throw new NotFoundError("Client");

      const patient = await prisma.patient.create({
        data: { clinicId, ...request.body },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "patient.create",
        entityType: "Patient",
        entityId: patient.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: patient });
    },
  );

  app.patch(
    "/:id",
    {
      preHandler: [staffWrite],
      schema: { tags: ["patients"], params: idParam, body: updateBody },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.patient.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Patient");

      const patient = await prisma.patient.update({
        where: { id: existing.id },
        data: request.body,
      });

      await recordAudit({
        clinicId,
        userId,
        action: "patient.update",
        entityType: "Patient",
        entityId: patient.id,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: patient };
    },
  );
}
