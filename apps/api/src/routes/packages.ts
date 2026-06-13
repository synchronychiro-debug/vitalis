import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError, AppError } from "../lib/errors.js";
import { idParam } from "../schemas/common.js";

const adminOnly = requireRole("SUPER_ADMIN", "ADMIN");
const staff = requireRole("SUPER_ADMIN", "ADMIN", "PROVIDER", "STAFF");

const itemSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

async function assertServicesInClinic(clinicId: string, serviceIds: string[]) {
  const unique = [...new Set(serviceIds)];
  const count = await prisma.service.count({
    where: { clinicId, id: { in: unique } },
  });
  if (count !== unique.length) {
    throw new AppError(400, "One or more services do not exist in this clinic");
  }
}

export async function packageRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    { preHandler: [requireAuth], schema: { tags: ["packages"] } },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const packages = await prisma.package.findMany({
        where: { clinicId, isActive: true },
        orderBy: { name: "asc" },
        include: { items: true },
      });
      return { success: true, data: packages };
    },
  );

  app.get(
    "/:id",
    { preHandler: [requireAuth], schema: { tags: ["packages"], params: idParam } },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const pkg = await prisma.package.findFirst({
        where: { id: request.params.id, clinicId },
        include: { items: { include: { service: true } } },
      });
      if (!pkg) throw new NotFoundError("Package");
      return { success: true, data: pkg };
    },
  );

  app.post(
    "/",
    {
      preHandler: [adminOnly],
      schema: {
        tags: ["packages"],
        body: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.number().int().min(0),
          expirationDays: z.number().int().positive().optional(),
          items: z.array(itemSchema).min(1),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);
      const { name, description, price, expirationDays, items } = request.body;

      await assertServicesInClinic(
        clinicId,
        items.map((i) => i.serviceId),
      );

      const pkg = await prisma.package.create({
        data: {
          clinicId,
          name,
          description,
          price,
          expirationDays,
          items: {
            create: items.map((i) => ({
              serviceId: i.serviceId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "package.create",
        entityType: "Package",
        entityId: pkg.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: pkg });
    },
  );

  app.patch(
    "/:id",
    {
      preHandler: [adminOnly],
      schema: {
        tags: ["packages"],
        params: idParam,
        body: z
          .object({
            name: z.string().min(1),
            description: z.string(),
            price: z.number().int().min(0),
            expirationDays: z.number().int().positive(),
            isActive: z.boolean(),
          })
          .partial(),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.package.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Package");

      const pkg = await prisma.package.update({
        where: { id: existing.id },
        data: request.body,
        include: { items: true },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "package.update",
        entityType: "Package",
        entityId: pkg.id,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: pkg };
    },
  );

  // Sell a package to a client. Credits/usage roll up to the client account
  // and are shared across all of the client's pets.
  app.post(
    "/:id/purchase",
    {
      preHandler: [staff],
      schema: {
        tags: ["packages"],
        params: idParam,
        body: z.object({ clientId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);

      const [pkg, client] = await Promise.all([
        prisma.package.findFirst({
          where: { id: request.params.id, clinicId },
        }),
        prisma.client.findFirst({
          where: { id: request.body.clientId, clinicId },
        }),
      ]);
      if (!pkg) throw new NotFoundError("Package");
      if (!client) throw new NotFoundError("Client");

      const expiresAt = pkg.expirationDays
        ? new Date(Date.now() + pkg.expirationDays * 24 * 60 * 60 * 1000)
        : null;

      const clientPackage = await prisma.clientPackage.create({
        data: { clientId: client.id, packageId: pkg.id, expiresAt },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "package.purchase",
        entityType: "ClientPackage",
        entityId: clientPackage.id,
        changes: { packageId: pkg.id, clientId: client.id },
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: clientPackage });
    },
  );
}
