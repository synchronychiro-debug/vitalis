import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth, getAuthUser } from "../middleware/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { email: string; password: string; clinicId: string } }>(
    "/login",
    async (request, reply) => {
      const { email, password, clinicId } = request.body;

      const user = await prisma.user.findUnique({
        where: { clinicId_email: { clinicId, email } },
      });

      if (!user || !user.isActive) {
        return reply
          .code(401)
          .send({ success: false, error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply
          .code(401)
          .send({ success: false, error: "Invalid credentials" });
      }

      const payload = {
        userId: user.id,
        clinicId: user.clinicId,
        role: user.role,
      };

      const accessToken = app.jwt.sign(payload, { expiresIn: "15m" });

      const refreshToken = crypto.randomUUID();
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
      };
    },
  );

  app.post<{ Body: { refreshToken: string } }>(
    "/refresh",
    async (request, reply) => {
      const { refreshToken } = request.body;

      const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
        if (stored) {
          await prisma.refreshToken.delete({ where: { id: stored.id } });
        }
        return reply
          .code(401)
          .send({ success: false, error: "Invalid refresh token" });
      }

      await prisma.refreshToken.delete({ where: { id: stored.id } });

      const payload = {
        userId: stored.user.id,
        clinicId: stored.user.clinicId,
        role: stored.user.role,
      };

      const newAccessToken = app.jwt.sign(payload, { expiresIn: "15m" });
      const newRefreshToken = crypto.randomUUID();

      await prisma.refreshToken.create({
        data: {
          userId: stored.user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 900,
        },
      };
    },
  );

  app.post(
    "/logout",
    { preHandler: [requireAuth] },
    async (request) => {
      const { userId } = getAuthUser(request);
      await prisma.refreshToken.deleteMany({ where: { userId } });
      return { success: true, data: null };
    },
  );

  app.get(
    "/me",
    { preHandler: [requireAuth] },
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
}
