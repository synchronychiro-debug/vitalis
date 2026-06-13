import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { SoapSection } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError } from "../lib/errors.js";
import { idParam } from "../schemas/common.js";

const providerPlus = requireRole("SUPER_ADMIN", "ADMIN", "PROVIDER");

const variableSchema = z.object({
  placeholder: z.string().min(1),
  type: z.enum(["CHOICE", "TEXT", "NUMERIC", "DATE", "ANATOMICAL"]),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export async function macroRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // List macros (system + provider's own)
  app.get(
    "/",
    {
      preHandler: [requireAuth],
      schema: {
        tags: ["macros"],
        querystring: z.object({
          soapSection: z.nativeEnum(SoapSection).optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const { soapSection } = request.query;

      const where: Record<string, unknown> = {
        clinicId,
        isActive: true,
        OR: [{ isSystem: true }, { providerId: userId }],
      };
      if (soapSection) where["soapSection"] = soapSection;

      const macros = await prisma.macro.findMany({
        where,
        orderBy: [{ isSystem: "desc" }, { title: "asc" }],
      });
      return { success: true, data: macros };
    },
  );

  // Create macro
  app.post(
    "/",
    {
      preHandler: [providerPlus],
      schema: {
        tags: ["macros"],
        body: z.object({
          title: z.string().min(1),
          soapSection: z.nativeEnum(SoapSection),
          body: z.string().min(1),
          variables: z.array(variableSchema).default([]),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId, role } = getAuthUser(request);

      const macro = await prisma.macro.create({
        data: {
          clinicId,
          providerId: role === "SUPER_ADMIN" || role === "ADMIN" ? null : userId,
          isSystem: role === "SUPER_ADMIN" || role === "ADMIN",
          title: request.body.title,
          soapSection: request.body.soapSection,
          body: request.body.body,
          variables: request.body.variables as unknown as object,
        },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "macro.create",
        entityType: "Macro",
        entityId: macro.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: macro });
    },
  );

  // Update macro
  app.patch(
    "/:id",
    {
      preHandler: [providerPlus],
      schema: {
        tags: ["macros"],
        params: idParam,
        body: z.object({
          title: z.string().min(1).optional(),
          body: z.string().min(1).optional(),
          variables: z.array(variableSchema).optional(),
          isActive: z.boolean().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.macro.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Macro");

      const { variables, ...rest } = request.body;
      const macro = await prisma.macro.update({
        where: { id: existing.id },
        data: {
          ...rest,
          ...(variables ? { variables: variables as unknown as object } : {}),
        },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "macro.update",
        entityType: "Macro",
        entityId: macro.id,
        ipAddress: request.ip,
      });

      return { success: true, data: macro };
    },
  );

  // Delete (deactivate) macro
  app.delete(
    "/:id",
    {
      preHandler: [providerPlus],
      schema: { tags: ["macros"], params: idParam },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.macro.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Macro");

      await prisma.macro.update({
        where: { id: existing.id },
        data: { isActive: false },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "macro.delete",
        entityType: "Macro",
        entityId: existing.id,
        ipAddress: request.ip,
      });

      return { success: true, data: { deleted: true } };
    },
  );
}
