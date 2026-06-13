import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { UserRole } from "@prisma/client";
import {
  getApp,
  closeApp,
  resetDb,
  createClinic,
  createUser,
  createClient,
  createService,
  tokenFor,
  auth,
} from "./helpers.js";

async function adminSetup() {
  const app = await getApp();
  const clinic = await createClinic();
  const admin = await createUser(clinic.id, UserRole.ADMIN);
  const token = await tokenFor(app, clinic.id, admin.email);
  return { app, clinic, admin, token };
}

describe("services", () => {
  beforeEach(resetDb);
  afterAll(closeApp);

  it("admin creates a service", async () => {
    const { app, token } = await adminSetup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/services",
      headers: auth(token),
      payload: { name: "Laser", price: 5000, duration: 15 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.price).toBe(5000);
  });

  it("forbids a provider from creating services", async () => {
    const { app, clinic } = await adminSetup();
    const provider = await createUser(clinic.id, UserRole.PROVIDER);
    const token = await tokenFor(app, clinic.id, provider.email);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/services",
      headers: auth(token),
      payload: { name: "Laser", price: 5000 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects a negative price", async () => {
    const { app, token } = await adminSetup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/services",
      headers: auth(token),
      payload: { name: "Bad", price: -100 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("packages", () => {
  beforeEach(resetDb);
  afterAll(closeApp);

  it("creates a package with items and sells it to a client", async () => {
    const { app, clinic, token } = await adminSetup();
    const service = await createService(clinic.id);
    const client = await createClient(clinic.id);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/packages",
      headers: auth(token),
      payload: {
        name: "5 Adjustments",
        price: 30000,
        expirationDays: 90,
        items: [{ serviceId: service.id, quantity: 5 }],
      },
    });
    expect(created.statusCode).toBe(201);
    const pkgId = created.json().data.id;
    expect(created.json().data.items).toHaveLength(1);

    const purchase = await app.inject({
      method: "POST",
      url: `/api/v1/packages/${pkgId}/purchase`,
      headers: auth(token),
      payload: { clientId: client.id },
    });
    expect(purchase.statusCode).toBe(201);
    expect(purchase.json().data.clientId).toBe(client.id);
    expect(purchase.json().data.expiresAt).not.toBeNull();
  });

  it("rejects a package referencing a service from another clinic", async () => {
    const { app, token } = await adminSetup();
    const otherClinic = await createClinic("Other");
    const foreignService = await createService(otherClinic.id);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/packages",
      headers: auth(token),
      payload: {
        name: "Bad bundle",
        price: 1000,
        items: [{ serviceId: foreignService.id, quantity: 1 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });
});
