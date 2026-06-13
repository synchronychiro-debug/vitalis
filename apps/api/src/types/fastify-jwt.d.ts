import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; clinicId: string; role: string };
    user: { userId: string; clinicId: string; role: string };
  }
}
