import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { SchedulingMode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";

export async function clinicRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/current",
    { preHandler: [requireAuth], schema: { tags: ["clinics"] } },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
      return { success: true, data: clinic };
    },
  );

  app.patch(
    "/current",
    {
      preHandler: [requireRole("SUPER_ADMIN", "ADMIN")],
      schema: {
        tags: ["clinics"],
        body: z
          .object({
            name: z.string().min(1),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            zipCode: z.string(),
            phone: z.string(),
            email: z.string().email(),
            website: z.string().url(),
            logoUrl: z.string().url(),
            timezone: z.string(),
            schedulingMode: z.nativeEnum(SchedulingMode),
            defaultAppointmentDuration: z.number().int().positive().max(600),
            isActive: z.boolean(),
          })
          .partial(),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const clinic = await prisma.clinic.update({
        where: { id: clinicId },
        data: request.body,
      });

      await recordAudit({
        clinicId,
        userId,
        action: "clinic.update",
        entityType: "Clinic",
        entityId: clinicId,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: clinic };
    },
  );
}
