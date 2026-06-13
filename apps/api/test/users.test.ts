import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { UserRole } from "@prisma/client";
import {
  getApp,
  closeApp,
  resetDb,
  createClinic,
  createUser,
  tokenFor,
  auth,
} from "./helpers.js";

describe("users", () => {
  beforeEach(resetDb);
  afterAll(closeApp);

  it("lets an admin create a provider", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const admin = await createUser(clinic.id, UserRole.ADMIN);
    const token = await tokenFor(app, clinic.id, admin.email);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: auth(token),
      payload: {
        email: "newprov@test.dev",
        password: "secret123",
        firstName: "New",
        lastName: "Provider",
        role: "PROVIDER",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.role).toBe("PROVIDER");
    expect(body.data).not.toHaveProperty("passwordHash");
  });

  it("forbids a provider from creating users", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const provider = await createUser(clinic.id, UserRole.PROVIDER);
    const token = await tokenFor(app, clinic.id, provider.email);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: auth(token),
      payload: {
        email: "x@test.dev",
        password: "secret123",
        firstName: "A",
        lastName: "B",
        role: "STAFF",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("stops a plain admin from minting a super admin", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const admin = await createUser(clinic.id, UserRole.ADMIN);
    const token = await tokenFor(app, clinic.id, admin.email);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: auth(token),
      payload: {
        email: "super@test.dev",
        password: "secret123",
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("disables a user via PATCH and blocks their login", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const admin = await createUser(clinic.id, UserRole.SUPER_ADMIN);
    const target = await createUser(clinic.id, UserRole.PROVIDER);
    const token = await tokenFor(app, clinic.id, admin.email);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${target.id}`,
      headers: auth(token),
      payload: { isActive: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.isActive).toBe(false);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: target.email, password: "password123" },
    });
    expect(login.statusCode).toBe(401);
  });

  it("filters the user list by role", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const admin = await createUser(clinic.id, UserRole.ADMIN);
    await createUser(clinic.id, UserRole.PROVIDER);
    await createUser(clinic.id, UserRole.PROVIDER);
    const token = await tokenFor(app, clinic.id, admin.email);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users?role=PROVIDER",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data.every((u: { role: string }) => u.role === "PROVIDER")).toBe(true);
  });

  it("returns 409 when creating a user with a duplicate email", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const admin = await createUser(clinic.id, UserRole.ADMIN);
    const token = await tokenFor(app, clinic.id, admin.email);

    const payload = {
      email: "dupe@test.dev",
      password: "secret123",
      firstName: "A",
      lastName: "B",
      role: "STAFF",
    };
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: auth(token),
      payload,
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: auth(token),
      payload,
    });
    expect(second.statusCode).toBe(409);
  });

  it("admin can reset another user's password", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const admin = await createUser(clinic.id, UserRole.ADMIN);
    const target = await createUser(clinic.id, UserRole.PROVIDER);
    const token = await tokenFor(app, clinic.id, admin.email);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/users/${target.id}/reset-password`,
      headers: auth(token),
      payload: { newPassword: "brandnew123" },
    });
    expect(res.statusCode).toBe(200);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: target.email, password: "brandnew123" },
    });
    expect(login.statusCode).toBe(200);
  });
});
