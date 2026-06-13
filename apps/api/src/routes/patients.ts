import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, getAuthUser } from "../middleware/auth.js";
import { NotFoundError } from "../lib/errors.js";

export async function patientRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId, role, userId } = getAuthUser(request);
      const query = request.query as { page?: string; limit?: string; species?: string; status?: string; clientId?: string };

      const page = parseInt(query.page ?? "1", 10);
      const limit = Math.min(parseInt(query.limit ?? "25", 10), 100);
      const skip = (page - 1) * limit;

      const where: any = { clinicId };
      if (query.species) where.species = query.species.toUpperCase();
      if (query.status) where.status = query.status.toUpperCase();
      if (query.clientId) where.clientId = query.clientId;

      if (role === "CLIENT") {
        const client = await prisma.client.findFirst({ where: { clinicId, userId } });
        if (client) where.clientId = client.id;
      }

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: { client: { select: { firstName: true, lastName: true } } } }),
        prisma.patient.count({ where }),
      ]);

      return {
        success: true,
        data: patients,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { clinicId } = getAuthUser(request);
      const patient = await prisma.patient.findFirst({
        where: { id: request.params.id, clinicId },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          weightHistory: { orderBy: { recordedAt: "desc" }, take: 10 },
        },
      });

      if (!patient) {
        return reply.code(404).send({ success: false, error: "Patient not found" });
      }

      return { success: true, data: patient };
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const body = request.body as any;

      const patient = await prisma.patient.create({
        data: {
          clinicId,
          clientId: body.clientId,
          name: body.name,
          species: body.species?.toUpperCase(),
          breed: body.breed,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          sex: body.sex?.toUpperCase(),
          color: body.color,
          currentWeight: body.currentWeight,
          microchipId: body.microchipId,
          primaryVetName: body.primaryVetName,
          primaryVetClinic: body.primaryVetClinic,
          primaryVetPhone: body.primaryVetPhone,
          primaryVetEmail: body.primaryVetEmail,
          shareNotesWithVet: body.shareNotesWithVet ?? false,
          treatmentGoals: body.treatmentGoals,
          estimatedTotalVisits: body.estimatedTotalVisits,
          chiefComplaint: body.chiefComplaint,
          allergies: body.allergies,
          medications: body.medications,
          priorConditions: body.priorConditions,
        },
      });

      return { success: true, data: patient };
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { clinicId } = getAuthUser(request);
      const existing = await prisma.patient.findFirst({
        where: { id: request.params.id, clinicId },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: "Patient not found" });
      }

      const patient = await prisma.patient.update({
        where: { id: request.params.id },
        data: request.body as any,
      });

      return { success: true, data: patient };
    },
  );
}
