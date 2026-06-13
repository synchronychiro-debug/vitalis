import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { Prisma } from "@prisma/client";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { AppError } from "./lib/errors.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { clinicRoutes } from "./routes/clinics.js";
import { userRoutes } from "./routes/users.js";
import { patientRoutes } from "./routes/patients.js";
import { clientRoutes } from "./routes/clients.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { serviceRoutes } from "./routes/services.js";
import { packageRoutes } from "./routes/packages.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "test" ? "silent" : "info",
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "dev-secret-change-me",
  });
  await app.register(rateLimit, {
    max: process.env["NODE_ENV"] === "test" ? 10000 : 100,
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
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Zod / Fastify schema validation failures
    if (error.validation) {
      const details: Record<string, string[]> = {};
      for (const v of error.validation) {
        const key =
          (v.params?.["issue"] as { path?: (string | number)[] })?.path?.join(
            ".",
          ) ||
          v.instancePath?.replace(/^\//, "").replace(/\//g, ".") ||
          "_";
        (details[key] ??= []).push(v.message ?? "invalid");
      }
      return reply.code(400).send({
        success: false,
        error: "Validation failed",
        statusCode: 400,
        details,
      });
    }

    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send({ success: false, error: error.message, statusCode: error.statusCode });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return reply.code(409).send({
          success: false,
          error: "A record with these values already exists",
          statusCode: 409,
        });
      }
      if (error.code === "P2025") {
        return reply
          .code(404)
          .send({ success: false, error: "Record not found", statusCode: 404 });
      }
      if (error.code === "P2003") {
        return reply.code(400).send({
          success: false,
          error: "Referenced record does not exist",
          statusCode: 400,
        });
      }
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      });
    }

    request.log.error(error);
    return reply
      .code(500)
      .send({ success: false, error: "Internal server error", statusCode: 500 });
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(clinicRoutes, { prefix: "/api/v1/clinics" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(patientRoutes, { prefix: "/api/v1/patients" });
  await app.register(clientRoutes, { prefix: "/api/v1/clients" });
  await app.register(appointmentRoutes, { prefix: "/api/v1/appointments" });
  await app.register(serviceRoutes, { prefix: "/api/v1/services" });
  await app.register(packageRoutes, { prefix: "/api/v1/packages" });

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const webDist = join(__dirname, "../../web/dist");
  if (process.env["NODE_ENV"] === "production" && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/") || request.url === "/health" || request.url.startsWith("/docs")) {
        return reply.code(404).send({ success: false, error: "Not found", statusCode: 404 });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}
