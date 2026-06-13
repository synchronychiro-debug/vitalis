import type { FastifyRequest, FastifyReply } from "fastify";

export interface AuthUser {
  userId: string;
  clinicId: string;
  role: string;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ success: false, error: "Unauthorized" });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    const user = request.user as AuthUser;
    if (!roles.includes(user.role)) {
      reply.code(403).send({ success: false, error: "Insufficient permissions" });
    }
  };
}

export function getAuthUser(request: FastifyRequest): AuthUser {
  return request.user as AuthUser;
}
