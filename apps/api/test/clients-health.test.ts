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

describe("health", () => {
  afterAll(closeApp);

  it("reports ok with a database connection", async () => {
    const app = await getApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("ok");
  });
});

describe("clients", () => {
  beforeEach(resetDb);
  afterAll(closeApp);

  async function setup() {
    const app = await getApp();
    const clinic = await createClinic();
    const staff = await createUser(clinic.id, UserRole.STAFF);
    const token = await tokenFor(app, clinic.id, staff.email);
    return { app, clinic, token };
  }

  it("creates a client and finds it by search", async () => {
    const { app, token } = await setup();
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: auth(token),
      payload: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@test.dev",
        phone: "(352) 555-9999",
      },
    });
    expect(create.statusCode).toBe(201);

    const search = await app.inject({
      method: "GET",
      url: "/api/v1/clients?search=jane",
      headers: auth(token),
    });
    expect(search.statusCode).toBe(200);
    expect(search.json().data).toHaveLength(1);
    expect(search.json().data[0]._count.patients).toBe(0);
  });

  it("rejects an invalid email", async () => {
    const { app, token } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: auth(token),
      payload: { firstName: "X", lastName: "Y", email: "nope", phone: "123" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("forbids a client-role user from listing clients", async () => {
    const { app, clinic } = await setup();
    const clientUser = await createUser(clinic.id, UserRole.CLIENT);
    const token = await tokenFor(app, clinic.id, clientUser.email);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/clients",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(403);
  });
});
