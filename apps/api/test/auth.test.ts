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
  TEST_PASSWORD,
} from "./helpers.js";

describe("auth", () => {
  beforeEach(resetDb);
  afterAll(closeApp);

  it("logs in with valid credentials", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const user = await createUser(clinic.id, UserRole.ADMIN);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: user.email, password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTypeOf("string");
    expect(body.data.refreshToken).toBeTypeOf("string");
    expect(body.data.expiresIn).toBe(900);
  });

  it("rejects a wrong password with 401", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const user = await createUser(clinic.id, UserRole.ADMIN);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: user.email, password: "wrong" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().success).toBe(false);
  });

  it("rejects login for an inactive user", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const user = await createUser(clinic.id, UserRole.PROVIDER);
    await (await import("../src/lib/prisma.js")).prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: user.email, password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for malformed login body", async () => {
    const app = await getApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: "not-a-uuid", email: "bad", password: "" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns the current user from /me", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const user = await createUser(clinic.id, UserRole.PROVIDER);
    const token = await tokenFor(app, clinic.id, user.email);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.email).toBe(user.email);
  });

  it("rejects /me without a token", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("rotates refresh tokens and invalidates the old one", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const user = await createUser(clinic.id, UserRole.ADMIN);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: user.email, password: TEST_PASSWORD },
    });
    const { refreshToken } = login.json().data;

    const refreshed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().data.accessToken).toBeTypeOf("string");

    // Old token can no longer be used.
    const reuse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
  });

  it("supports the full forgot/reset password flow", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const user = await createUser(clinic.id, UserRole.PROVIDER);

    const forgot = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { clinicId: clinic.id, email: user.email },
    });
    expect(forgot.statusCode).toBe(200);
    const resetToken = forgot.json().data.resetToken;
    expect(resetToken).toBeTypeOf("string");

    const reset = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: resetToken, newPassword: "newpass123" },
    });
    expect(reset.statusCode).toBe(200);

    // Old password no longer works, new one does.
    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: user.email, password: TEST_PASSWORD },
    });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { clinicId: clinic.id, email: user.email, password: "newpass123" },
    });
    expect(newLogin.statusCode).toBe(200);
  });

  it("does not reveal whether an email exists on forgot-password", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { clinicId: clinic.id, email: "nobody@test.dev" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.sent).toBe(true);
    expect(res.json().data.resetToken).toBeUndefined();
  });

  it("rejects a weak password on reset", async () => {
    const app = await getApp();
    const clinic = await createClinic();
    const user = await createUser(clinic.id, UserRole.PROVIDER);
    const forgot = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { clinicId: clinic.id, email: user.email },
    });
    const resetToken = forgot.json().data.resetToken;

    const reset = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: resetToken, newPassword: "short" },
    });
    expect(reset.statusCode).toBe(400);
  });
});
