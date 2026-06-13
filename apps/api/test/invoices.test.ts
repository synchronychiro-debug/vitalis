import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  getApp,
  closeApp,
  resetDb,
  seedClinicWithAdmin,
  createClient,
  createService,
  auth,
} from "./helpers";

describe("invoices", () => {
  let app: FastifyInstance;
  let clinicId: string;
  let adminToken: string;
  let clientId: string;
  let serviceId: string;

  afterAll(() => closeApp());

  beforeEach(async () => {
    await resetDb();
    const seed = await seedClinicWithAdmin();
    app = seed.app;
    clinicId = seed.clinic.id;
    adminToken = seed.token;

    const client = await createClient(clinicId);
    clientId = client.id;

    const service = await createService(clinicId);
    serviceId = service.id;
  });

  it("creates an invoice with line items", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [
          { serviceId, description: "Adjustment", quantity: 1, unitPrice: 7500 },
          { description: "Custom charge", quantity: 2, unitPrice: 1000 },
        ],
        taxAmount: 500,
      },
    });

    expect(res.statusCode).toBe(201);
    const { data } = res.json();
    expect(data.subtotal).toBe(9500);
    expect(data.taxAmount).toBe(500);
    expect(data.totalDue).toBe(10000);
    expect(data.status).toBe("DRAFT");
    expect(data.items).toHaveLength(2);
  });

  it("issues a draft invoice and records payment", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [{ description: "Adjustment", quantity: 1, unitPrice: 7500 }],
      },
    });
    const invoiceId = createRes.json().data.id;

    const issueRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: auth(adminToken),
      payload: { status: "ISSUED" },
    });
    expect(issueRes.json().data.status).toBe("ISSUED");
    expect(issueRes.json().data.issuedAt).toBeTruthy();

    const payRes = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/payments`,
      headers: auth(adminToken),
      payload: { amount: 7500, applyCredit: 0 },
    });
    expect(payRes.json().data.status).toBe("PAID");
    expect(payRes.json().data.paidAmount).toBe(7500);
    expect(payRes.json().data.paidAt).toBeTruthy();
  });

  it("supports partial payment", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [{ description: "Eval", quantity: 1, unitPrice: 10000 }],
      },
    });
    const invoiceId = createRes.json().data.id;

    await app.inject({
      method: "PATCH",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: auth(adminToken),
      payload: { status: "ISSUED" },
    });

    const payRes = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/payments`,
      headers: auth(adminToken),
      payload: { amount: 5000, applyCredit: 0 },
    });
    expect(payRes.json().data.status).toBe("PARTIAL");
    expect(payRes.json().data.paidAmount).toBe(5000);
  });

  it("rejects payment on a draft invoice", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [{ description: "Charge", quantity: 1, unitPrice: 5000 }],
      },
    });
    const invoiceId = createRes.json().data.id;

    const payRes = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/payments`,
      headers: auth(adminToken),
      payload: { amount: 5000, applyCredit: 0 },
    });
    expect(payRes.statusCode).toBe(400);
  });

  it("prevents editing line items on a non-draft invoice", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [{ description: "Charge", quantity: 1, unitPrice: 5000 }],
      },
    });
    const invoiceId = createRes.json().data.id;

    await app.inject({
      method: "PATCH",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: auth(adminToken),
      payload: { status: "ISSUED" },
    });

    const editRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: auth(adminToken),
      payload: { items: [{ description: "New item", quantity: 1, unitPrice: 9999 }] },
    });
    expect(editRes.statusCode).toBe(400);
  });

  it("lists and filters invoices by status", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [{ description: "A", quantity: 1, unitPrice: 1000 }],
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [{ description: "B", quantity: 1, unitPrice: 2000 }],
      },
    });

    const allRes = await app.inject({
      method: "GET",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
    });
    expect(allRes.json().data).toHaveLength(2);

    const filteredRes = await app.inject({
      method: "GET",
      url: "/api/v1/invoices?status=DRAFT",
      headers: auth(adminToken),
    });
    expect(filteredRes.json().data).toHaveLength(2);
  });

  it("voids an issued invoice", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: auth(adminToken),
      payload: {
        clientId,
        items: [{ description: "Charge", quantity: 1, unitPrice: 5000 }],
      },
    });
    const invoiceId = createRes.json().data.id;

    await app.inject({
      method: "PATCH",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: auth(adminToken),
      payload: { status: "ISSUED" },
    });

    const voidRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: auth(adminToken),
      payload: { status: "VOID" },
    });
    expect(voidRes.json().data.status).toBe("VOID");
  });
});
