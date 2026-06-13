import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export const TEST_PASSWORD = "password123";

let appInstance: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

export async function closeApp(): Promise<void> {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
  }
  await prisma.$disconnect();
}

/** Truncates every table so each test starts from a clean slate. */
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

export async function createClinic(name = "Test Clinic") {
  return prisma.clinic.create({
    data: {
      name,
      address: "1 Test St",
      city: "Ocala",
      state: "FL",
      zipCode: "34471",
      phone: "(352) 555-0000",
      email: `clinic-${Date.now()}-${Math.random()}@test.dev`,
    },
  });
}

export async function createUser(
  clinicId: string,
  role: UserRole,
  email?: string,
) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return prisma.user.create({
    data: {
      clinicId,
      email: email ?? `${role.toLowerCase()}-${Date.now()}-${Math.random()}@test.dev`,
      passwordHash,
      firstName: "Test",
      lastName: role,
      role,
    },
  });
}

export async function createClient(clinicId: string, userId?: string) {
  return prisma.client.create({
    data: {
      clinicId,
      userId,
      firstName: "Owner",
      lastName: "Person",
      email: `owner-${Date.now()}-${Math.random()}@test.dev`,
      phone: "(352) 555-1111",
    },
  });
}

export async function createService(clinicId: string, price = 7500) {
  return prisma.service.create({
    data: { clinicId, name: "Adjustment", price, duration: 30 },
  });
}

/** Logs a user in and returns their access token. */
export async function tokenFor(
  app: FastifyInstance,
  clinicId: string,
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { clinicId, email, password: TEST_PASSWORD },
  });
  const body = res.json();
  if (!body.success) {
    throw new Error(`login failed: ${res.body}`);
  }
  return body.data.accessToken;
}

export function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

/** Convenience: a clinic with a super-admin and their token. */
export async function seedClinicWithAdmin() {
  const app = await getApp();
  const clinic = await createClinic();
  const admin = await createUser(clinic.id, UserRole.SUPER_ADMIN);
  const token = await tokenFor(app, clinic.id, admin.email);
  return { app, clinic, admin, token };
}
