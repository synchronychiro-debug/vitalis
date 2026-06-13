import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError } from "../lib/errors.js";
import { idParam, paginationQuery } from "../schemas/common.js";

const staff = requireRole("SUPER_ADMIN", "ADMIN", "PROVIDER", "STAFF");

const clientCore = {
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
};

export async function clientRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    {
      preHandler: [staff],
      schema: {
        tags: ["clients"],
        querystring: paginationQuery.extend({ search: z.string().optional() }),
      },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const { page = 1, limit = 25, search } = request.query;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { clinicId };
      if (search) {
        where["OR"] = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
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

  app.get(
    "/:id",
    { preHandler: [staff], schema: { tags: ["clients"], params: idParam } },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const client = await prisma.client.findFirst({
        where: { id: request.params.id, clinicId },
        include: {
          patients: { orderBy: { name: "asc" } },
          _count: { select: { invoices: true } },
        },
      });
      if (!client) throw new NotFoundError("Client");
      return { success: true, data: client };
    },
  );

  app.post(
    "/",
    {
      preHandler: [staff],
      schema: { tags: ["clients"], body: z.object(clientCore) },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);
      const client = await prisma.client.create({
        data: { clinicId, ...request.body },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "client.create",
        entityType: "Client",
        entityId: client.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: client });
    },
  );

  app.patch(
    "/:id",
    {
      preHandler: [staff],
      schema: {
        tags: ["clients"],
        params: idParam,
        body: z
          .object({ ...clientCore, isActive: z.boolean() })
          .partial(),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.client.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Client");

      const client = await prisma.client.update({
        where: { id: existing.id },
        data: request.body,
      });

      await recordAudit({
        clinicId,
        userId,
        action: "client.update",
        entityType: "Client",
        entityId: client.id,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: client };
    },
  );
}
