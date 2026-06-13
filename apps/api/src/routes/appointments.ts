import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, getAuthUser } from "../middleware/auth.js";

export async function appointmentRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId, role, userId } = getAuthUser(request);
      const query = request.query as {
        page?: string;
        limit?: string;
        providerId?: string;
        status?: string;
        from?: string;
        to?: string;
      };

      const page = parseInt(query.page ?? "1", 10);
      const limit = Math.min(parseInt(query.limit ?? "25", 10), 100);
      const skip = (page - 1) * limit;

      const where: any = { clinicId };
      if (query.providerId) where.providerId = query.providerId;
      if (query.status) where.status = query.status.toUpperCase();

      if (query.from || query.to) {
        where.scheduledAt = {};
        if (query.from) where.scheduledAt.gte = new Date(query.from);
        if (query.to) where.scheduledAt.lte = new Date(query.to);
      }

      if (role === "PROVIDER") {
        where.providerId = userId;
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledAt: "asc" },
          include: {
            patient: { select: { id: true, name: true, species: true } },
            client: { select: { id: true, firstName: true, lastName: true } },
            provider: { select: { id: true, firstName: true, lastName: true } },
          },
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

  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { clinicId } = getAuthUser(request);
      const appointment = await prisma.appointment.findFirst({
        where: { id: request.params.id, clinicId },
        include: {
          patient: true,
          client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!appointment) {
        return reply.code(404).send({ success: false, error: "Appointment not found" });
      }

      return { success: true, data: appointment };
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const body = request.body as any;

      const appointment = await prisma.appointment.create({
        data: {
          clinicId,
          patientId: body.patientId,
          clientId: body.clientId,
          providerId: body.providerId,
          type: body.type?.toUpperCase() ?? "ROUTINE_ADJUSTMENT",
          status: body.status?.toUpperCase() ?? "CONFIRMED",
          scheduledAt: new Date(body.scheduledAt),
          duration: body.duration ?? 30,
          location: body.location,
          notes: body.notes,
        },
        include: {
          patient: { select: { id: true, name: true, species: true } },
          client: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return { success: true, data: appointment };
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { clinicId } = getAuthUser(request);
      const existing = await prisma.appointment.findFirst({
        where: { id: request.params.id, clinicId },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: "Appointment not found" });
      }

      const body = request.body as any;
      const data: any = { ...body };
      if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
      if (body.status) data.status = body.status.toUpperCase();
      if (body.type) data.type = body.type.toUpperCase();

      const appointment = await prisma.appointment.update({
        where: { id: request.params.id },
        data,
      });

      return { success: true, data: appointment };
    },
  );
}
