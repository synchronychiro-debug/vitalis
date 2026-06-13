import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, getAuthUser } from "../middleware/auth.js";

const ACCESS_TTL = "15m";
const ACCESS_TTL_SECONDS = 900;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  await prisma.refreshToken.create({
    data: { userId, token, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  return token;
}

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        body: z.object({
          clinicId: z.string().uuid(),
          email: z.string().email(),
          password: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, email, password } = request.body;

      const user = await prisma.user.findUnique({
        where: { clinicId_email: { clinicId, email } },
      });

      const valid =
        user && user.isActive
          ? await bcrypt.compare(password, user.passwordHash)
          : false;

      if (!user || !valid) {
        return reply
          .code(401)
          .send({ success: false, error: "Invalid credentials" });
      }

      const accessToken = app.jwt.sign(
        { userId: user.id, clinicId: user.clinicId, role: user.role },
        { expiresIn: ACCESS_TTL },
      );
      const refreshToken = await issueRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        success: true,
        data: { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS },
      };
    },
  );

  app.post(
    "/refresh",
    {
      schema: {
        tags: ["auth"],
        body: z.object({ refreshToken: z.string().min(1) }),
      },
    },
    async (request, reply) => {
      const stored = await prisma.refreshToken.findUnique({
        where: { token: request.body.refreshToken },
        include: { user: true },
      });

      if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
        if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
        return reply
          .code(401)
          .send({ success: false, error: "Invalid refresh token" });
      }

      await prisma.refreshToken.delete({ where: { id: stored.id } });

      const accessToken = app.jwt.sign(
        {
          userId: stored.user.id,
          clinicId: stored.user.clinicId,
          role: stored.user.role,
        },
        { expiresIn: ACCESS_TTL },
      );
      const refreshToken = await issueRefreshToken(stored.user.id);

      return {
        success: true,
        data: { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS },
      };
    },
  );

  app.post(
    "/logout",
    { preHandler: [requireAuth], schema: { tags: ["auth"] } },
    async (request) => {
      const { userId } = getAuthUser(request);
      await prisma.refreshToken.deleteMany({ where: { userId } });
      return { success: true, data: null };
    },
  );

  app.get(
    "/me",
    { preHandler: [requireAuth], schema: { tags: ["auth"] } },
    async (request) => {
      const { userId } = getAuthUser(request);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
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
        },
      });
      return { success: true, data: user };
    },
  );

  // Request a password reset. Always returns success to avoid leaking which
  // emails are registered. Until email infrastructure lands (Phase 6), the
  // raw reset token is returned outside production so the flow is usable.
  app.post(
    "/forgot-password",
    {
      schema: {
        tags: ["auth"],
        body: z.object({
          clinicId: z.string().uuid(),
          email: z.string().email(),
        }),
      },
    },
    async (request) => {
      const { clinicId, email } = request.body;
      const user = await prisma.user.findUnique({
        where: { clinicId_email: { clinicId, email } },
      });

      let rawToken: string | null = null;
      if (user && user.isActive) {
        rawToken = crypto.randomUUID() + crypto.randomUUID();
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + RESET_TTL_MS),
          },
        });
      }

      const data: { sent: true; resetToken?: string } = { sent: true };
      if (rawToken && process.env["NODE_ENV"] !== "production") {
        data.resetToken = rawToken;
      }
      return { success: true, data };
    },
  );

  app.post(
    "/reset-password",
    {
      schema: {
        tags: ["auth"],
        body: z.object({
          token: z.string().min(1),
          newPassword: strongPassword,
        }),
      },
    },
    async (request, reply) => {
      const { token, newPassword } = request.body;
      const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      });

      if (!record || record.usedAt || record.expiresAt < new Date()) {
        return reply
          .code(400)
          .send({ success: false, error: "Invalid or expired reset token" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: record.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
        prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
      ]);

      await recordAudit({
        clinicId: record.user.clinicId,
        userId: record.userId,
        action: "password.reset",
        entityType: "User",
        entityId: record.userId,
        ipAddress: request.ip,
      });

      return { success: true, data: { reset: true } };
    },
  );
}
