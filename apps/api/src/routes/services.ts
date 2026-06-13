import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";

export async function serviceRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const services = await prisma.service.findMany({
        where: { clinicId, isActive: true },
        orderBy: { name: "asc" },
      });
      return { success: true, data: services };
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/",
    { preHandler: [requireRole("SUPER_ADMIN", "ADMIN")] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const body = request.body as any;

      const service = await prisma.service.create({
        data: {
          clinicId,
          name: body.name,
          description: body.description,
          price: body.price,
          duration: body.duration ?? 30,
        },
      });

      return { success: true, data: service };
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/:id",
    { preHandler: [requireRole("SUPER_ADMIN", "ADMIN")] },
    async (request, reply) => {
      const { clinicId } = getAuthUser(request);
      const existing = await prisma.service.findFirst({
        where: { id: request.params.id, clinicId },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: "Service not found" });
      }

      const service = await prisma.service.update({
        where: { id: request.params.id },
        data: request.body as any,
      });

      return { success: true, data: service };
    },
  );
}
