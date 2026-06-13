import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";

export async function clinicRoutes(app: FastifyInstance) {
  app.get(
    "/current",
    { preHandler: [requireAuth] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
      });
      return { success: true, data: clinic };
    },
  );

  app.patch<{ Body: Record<string, unknown> }>(
    "/current",
    { preHandler: [requireRole("SUPER_ADMIN", "ADMIN")] },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const clinic = await prisma.clinic.update({
        where: { id: clinicId },
        data: request.body,
      });
      return { success: true, data: clinic };
    },
  );
}
