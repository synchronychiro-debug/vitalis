import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { clinicRoutes } from "./routes/clinics.js";
import { patientRoutes } from "./routes/patients.js";
import { clientRoutes } from "./routes/clients.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { serviceRoutes } from "./routes/services.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "test" ? "silent" : "info",
    },
  });

  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "dev-secret-change-me",
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Vitalis EHR API",
        version: "0.1.0",
        description:
          "Practice management and EHR platform for animal chiropractors",
      },
      servers: [{ url: "http://localhost:3000" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.decorate(
    "authenticate",
    async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch {
        reply.code(401).send({ success: false, error: "Unauthorized" });
      }
    },
  );

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(clinicRoutes, { prefix: "/api/v1/clinics" });
  await app.register(patientRoutes, { prefix: "/api/v1/patients" });
  await app.register(clientRoutes, { prefix: "/api/v1/clients" });
  await app.register(appointmentRoutes, { prefix: "/api/v1/appointments" });
  await app.register(serviceRoutes, { prefix: "/api/v1/services" });

  return app;
}
