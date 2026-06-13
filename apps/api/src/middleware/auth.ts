import type { FastifyRequest, FastifyReply } from "fastify";

export interface AuthUser {
  userId: string;
  clinicId: string;
  role: string;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, error: "Unauthorized" });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }

    const user = request.user as AuthUser;
    if (!roles.includes(user.role)) {
      request.log.warn(
        { userId: user.userId, role: user.role, required: roles },
        "permission denied",
      );
      return reply
        .code(403)
        .send({ success: false, error: "Insufficient permissions" });
    }
  };
}

export function getAuthUser(request: FastifyRequest): AuthUser {
  return request.user as AuthUser;
}
