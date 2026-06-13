import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireRole, getAuthUser } from "../middleware/auth.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { idParam, paginationQuery } from "../schemas/common.js";
import { strongPassword } from "./auth.js";

const userSelect = {
  id: true,
  clinicId: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phone: true,
  isActive: true,
  mfaEnabled: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export async function userRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const adminOnly = { preHandler: [requireRole("SUPER_ADMIN", "ADMIN")] };

  app.get(
    "/",
    {
      ...adminOnly,
      schema: {
        tags: ["users"],
        querystring: paginationQuery.extend({
          role: z.nativeEnum(UserRole).optional(),
          search: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const { page = 1, limit = 25, role, search } = request.query;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { clinicId };
      if (role) where["role"] = role;
      if (search) {
        where["OR"] = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { lastName: "asc" },
          select: userSelect,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        success: true,
        data: users,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },
  );

  app.get(
    "/:id",
    { ...adminOnly, schema: { tags: ["users"], params: idParam } },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const user = await prisma.user.findFirst({
        where: { id: request.params.id, clinicId },
        select: userSelect,
      });
      if (!user) throw new NotFoundError("User");
      return { success: true, data: user };
    },
  );

  app.post(
    "/",
    {
      ...adminOnly,
      schema: {
        tags: ["users"],
        body: z.object({
          email: z.string().email(),
          password: strongPassword,
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          role: z.nativeEnum(UserRole),
          phone: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const actor = getAuthUser(request);
      const { email, password, firstName, lastName, role, phone } =
        request.body;

      // Only super admins may mint other super admins.
      if (role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
        throw new ForbiddenError("Only a super admin can create super admins");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          clinicId: actor.clinicId,
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          phone,
        },
        select: userSelect,
      });

      await recordAudit({
        clinicId: actor.clinicId,
        userId: actor.userId,
        action: "user.create",
        entityType: "User",
        entityId: user.id,
        changes: { email, role },
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: user });
    },
  );

  app.patch(
    "/:id",
    {
      ...adminOnly,
      schema: {
        tags: ["users"],
        params: idParam,
        body: z.object({
          firstName: z.string().min(1).optional(),
          lastName: z.string().min(1).optional(),
          phone: z.string().optional(),
          role: z.nativeEnum(UserRole).optional(),
          isActive: z.boolean().optional(),
        }),
      },
    },
    async (request) => {
      const actor = getAuthUser(request);
      const existing = await prisma.user.findFirst({
        where: { id: request.params.id, clinicId: actor.clinicId },
      });
      if (!existing) throw new NotFoundError("User");

      if (
        request.body.role === "SUPER_ADMIN" &&
        actor.role !== "SUPER_ADMIN"
      ) {
        throw new ForbiddenError("Only a super admin can grant super admin");
      }

      const user = await prisma.user.update({
        where: { id: existing.id },
        data: request.body,
        select: userSelect,
      });

      await recordAudit({
        clinicId: actor.clinicId,
        userId: actor.userId,
        action: "user.update",
        entityType: "User",
        entityId: user.id,
        changes: request.body,
        ipAddress: request.ip,
      });

      return { success: true, data: user };
    },
  );

  // Admin-initiated password reset (sets a new password directly).
  app.post(
    "/:id/reset-password",
    {
      ...adminOnly,
      schema: {
        tags: ["users"],
        params: idParam,
        body: z.object({ newPassword: strongPassword }),
      },
    },
    async (request) => {
      const actor = getAuthUser(request);
      const existing = await prisma.user.findFirst({
        where: { id: request.params.id, clinicId: actor.clinicId },
      });
      if (!existing) throw new NotFoundError("User");

      const passwordHash = await bcrypt.hash(request.body.newPassword, 12);
      await prisma.$transaction([
        prisma.user.update({ where: { id: existing.id }, data: { passwordHash } }),
        prisma.refreshToken.deleteMany({ where: { userId: existing.id } }),
      ]);

      await recordAudit({
        clinicId: actor.clinicId,
        userId: actor.userId,
        action: "user.reset_password",
        entityType: "User",
        entityId: existing.id,
        ipAddress: request.ip,
      });

      return { success: true, data: { reset: true } };
    },
  );
}
