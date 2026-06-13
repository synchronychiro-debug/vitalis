import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError } from "../lib/errors.js";
import { idParam } from "../schemas/common.js";

const adminOnly = requireRole("SUPER_ADMIN", "ADMIN");

export async function serviceRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    {
      preHandler: [requireAuth],
      schema: {
        tags: ["services"],
        querystring: z.object({
          includeInactive: z.coerce.boolean().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const where: Record<string, unknown> = { clinicId };
      if (!request.query.includeInactive) where["isActive"] = true;

      const services = await prisma.service.findMany({
        where,
        orderBy: { name: "asc" },
      });
      return { success: true, data: services };
    },
  );

  app.post(
    "/",
    {
      preHandler: [adminOnly],
      schema: {
        tags: ["services"],
        body: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.number().int().min(0),
          duration: z.number().int().positive().max(600).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);
      const service = await prisma.service.create({
        data: {
          clinicId,
          name: request.body.name,
          description: request.body.description,
          price: request.body.price,
          duration: request.body.duration ?? 30,
        },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "service.create",
        entityType: "Service",
        entityId: service.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: service });
    },
  );

  app.patch(
    "/:id",
    {
      preHandler: [adminOnly],
      schema: {
        tags: ["services"],
        params: idParam,
        body: z
          .object({
            name: z.string().min(1),
            description: z.string(),
            price: z.number().int().min(0),
            duration: z.number().int().positive().max(600),
            isActive: z.boolean(),
          })
          .partial(),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.service.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Service");

      const service = await prisma.service.update({
        where: { id: existing.id },
        data: request.body,
      });

      await recordAudit({
        clinicId,
        userId,
        action: "service.update",
        entityType: "Service",
        entityId: service.id,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: service };
    },
  );
}
