import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, getAuthUser } from "../middleware/auth.js";

export async function clientRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const query = request.query as { page?: string; limit?: string; search?: string };

      const page = parseInt(query.page ?? "1", 10);
      const limit = Math.min(parseInt(query.limit ?? "25", 10), 100);
      const skip = (page - 1) * limit;

      const where: any = { clinicId };
      if (query.search) {
        where.OR = [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ];
      }

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip,
          take: limit,
          orderBy: { lastName: "asc" },
          include: { _count: { select: { patients: true } } },
        }),
        prisma.client.count({ where }),
      ]);

      return {
        success: true,
        data: clients,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { clinicId } = getAuthUser(request);
      const client = await prisma.client.findFirst({
        where: { id: request.params.id, clinicId },
        include: {
          patients: { orderBy: { name: "asc" } },
          _count: { select: { invoices: true } },
        },
      });

      if (!client) {
        return reply.code(404).send({ success: false, error: "Client not found" });
      }

      return { success: true, data: client };
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const body = request.body as any;

      const client = await prisma.client.create({
        data: {
          clinicId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          address: body.address,
          city: body.city,
          state: body.state,
          zipCode: body.zipCode,
          notes: body.notes,
        },
      });

      return { success: true, data: client };
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { clinicId } = getAuthUser(request);
      const existing = await prisma.client.findFirst({
        where: { id: request.params.id, clinicId },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: "Client not found" });
      }

      const client = await prisma.client.update({
        where: { id: request.params.id },
        data: request.body as any,
      });

      return { success: true, data: client };
    },
  );
}
