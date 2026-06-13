import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "../lib/audit.js";
import { requireAuth, requireRole, getAuthUser } from "../middleware/auth.js";
import { NotFoundError, AppError } from "../lib/errors.js";
import { idParam, paginationQuery } from "../schemas/common.js";
import { resolvePage, pageMeta } from "../lib/pagination.js";

const staffPlus = requireRole("SUPER_ADMIN", "ADMIN", "PROVIDER", "STAFF");

const lineItemSchema = z.object({
  serviceId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().int().min(0),
});

export async function invoiceRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // List invoices
  app.get(
    "/",
    {
      preHandler: [staffPlus],
      schema: {
        tags: ["invoices"],
        querystring: paginationQuery.extend({
          clientId: z.string().uuid().optional(),
          status: z.nativeEnum(InvoiceStatus).optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const { clientId, status, from, to } = request.query;
      const { page, limit, skip } = resolvePage(request.query);

      const where: Record<string, unknown> = { clinicId };
      if (clientId) where["clientId"] = clientId;
      if (status) where["status"] = status;
      if (from || to) {
        const createdAt: Record<string, string> = {};
        if (from) createdAt["gte"] = from;
        if (to) createdAt["lte"] = to;
        where["createdAt"] = createdAt;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            client: { select: { id: true, firstName: true, lastName: true } },
            items: true,
            appointment: { select: { id: true, scheduledAt: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.invoice.count({ where }),
      ]);

      return { success: true, data: invoices, meta: pageMeta(total, page, limit) };
    },
  );

  // Get single invoice
  app.get(
    "/:id",
    {
      preHandler: [staffPlus],
      schema: { tags: ["invoices"], params: idParam },
    },
    async (request) => {
      const { clinicId } = getAuthUser(request);
      const invoice = await prisma.invoice.findFirst({
        where: { id: request.params.id, clinicId },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, email: true, creditBalance: true } },
          items: { include: { service: { select: { id: true, name: true } } } },
          appointment: { select: { id: true, scheduledAt: true, type: true } },
        },
      });
      if (!invoice) throw new NotFoundError("Invoice");
      return { success: true, data: invoice };
    },
  );

  // Create invoice
  app.post(
    "/",
    {
      preHandler: [staffPlus],
      schema: {
        tags: ["invoices"],
        body: z.object({
          clientId: z.string().uuid(),
          appointmentId: z.string().uuid().optional(),
          items: z.array(lineItemSchema).min(1),
          taxAmount: z.number().int().min(0).default(0),
        }),
      },
    },
    async (request, reply) => {
      const { clinicId, userId } = getAuthUser(request);
      const { clientId, appointmentId, items, taxAmount } = request.body;

      const client = await prisma.client.findFirst({
        where: { id: clientId, clinicId },
      });
      if (!client) throw new NotFoundError("Client");

      if (appointmentId) {
        const apt = await prisma.appointment.findFirst({
          where: { id: appointmentId, clinicId },
        });
        if (!apt) throw new NotFoundError("Appointment");
      }

      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const totalDue = subtotal + taxAmount;

      const invoice = await prisma.invoice.create({
        data: {
          clinicId,
          clientId,
          appointmentId: appointmentId ?? null,
          subtotal,
          taxAmount,
          totalDue,
          items: {
            create: items.map((i) => ({
              serviceId: i.serviceId ?? null,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.unitPrice * i.quantity,
            })),
          },
        },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          items: true,
        },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "invoice.create",
        entityType: "Invoice",
        entityId: invoice.id,
        ipAddress: request.ip,
      });

      return reply.code(201).send({ success: true, data: invoice });
    },
  );

  // Update invoice (only DRAFT invoices can be fully edited)
  app.patch(
    "/:id",
    {
      preHandler: [staffPlus],
      schema: {
        tags: ["invoices"],
        params: idParam,
        body: z.object({
          items: z.array(lineItemSchema).min(1).optional(),
          taxAmount: z.number().int().min(0).optional(),
          status: z.nativeEnum(InvoiceStatus).optional(),
        }),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const existing = await prisma.invoice.findFirst({
        where: { id: request.params.id, clinicId },
      });
      if (!existing) throw new NotFoundError("Invoice");

      const { items, taxAmount, status } = request.body;

      if (items && existing.status !== "DRAFT") {
        throw new AppError(400, "Can only edit line items on DRAFT invoices");
      }

      if (status === "VOID" && existing.status === "PAID") {
        throw new AppError(400, "Cannot void a fully paid invoice");
      }

      const updateData: Record<string, unknown> = {};

      if (status) {
        updateData["status"] = status;
        if (status === "ISSUED" && !existing.issuedAt) {
          updateData["issuedAt"] = new Date();
        }
      }

      if (items) {
        const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const newTax = taxAmount ?? existing.taxAmount;
        updateData["subtotal"] = subtotal;
        updateData["taxAmount"] = newTax;
        updateData["totalDue"] = subtotal + newTax;

        await prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
        await prisma.invoiceItem.createMany({
          data: items.map((i) => ({
            invoiceId: existing.id,
            serviceId: i.serviceId ?? null,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.unitPrice * i.quantity,
          })),
        });
      } else if (taxAmount !== undefined) {
        updateData["taxAmount"] = taxAmount;
        updateData["totalDue"] = existing.subtotal + taxAmount;
      }

      const invoice = await prisma.invoice.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          items: true,
        },
      });

      await recordAudit({
        clinicId,
        userId,
        action: "invoice.update",
        entityType: "Invoice",
        entityId: invoice.id,
        changes: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return { success: true, data: invoice };
    },
  );

  // Record payment
  app.post(
    "/:id/payments",
    {
      preHandler: [staffPlus],
      schema: {
        tags: ["invoices"],
        params: idParam,
        body: z.object({
          amount: z.number().int().positive(),
          applyCredit: z.number().int().min(0).default(0),
        }),
      },
    },
    async (request) => {
      const { clinicId, userId } = getAuthUser(request);
      const { amount, applyCredit } = request.body;

      const invoice = await prisma.invoice.findFirst({
        where: { id: request.params.id, clinicId },
        include: { client: true },
      });
      if (!invoice) throw new NotFoundError("Invoice");

      if (invoice.status === "PAID") {
        throw new AppError(400, "Invoice is already fully paid");
      }
      if (invoice.status === "VOID") {
        throw new AppError(400, "Cannot pay a voided invoice");
      }
      if (invoice.status === "DRAFT") {
        throw new AppError(400, "Issue the invoice before recording payment");
      }

      if (applyCredit > invoice.client.creditBalance) {
        throw new AppError(400, "Insufficient credit balance");
      }

      const totalPayment = amount + applyCredit;
      const newPaidAmount = invoice.paidAmount + totalPayment;
      const remaining = invoice.totalDue - invoice.creditApplied - newPaidAmount + applyCredit;

      const newStatus = remaining <= 0 ? "PAID" : "PARTIAL";

      const updated = await prisma.$transaction(async (tx) => {
        if (applyCredit > 0) {
          await tx.client.update({
            where: { id: invoice.clientId },
            data: { creditBalance: { decrement: applyCredit } },
          });
        }

        return tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            creditApplied: invoice.creditApplied + applyCredit,
            status: newStatus,
            paidAt: newStatus === "PAID" ? new Date() : null,
          },
          include: {
            client: { select: { id: true, firstName: true, lastName: true, creditBalance: true } },
            items: true,
          },
        });
      });

      await recordAudit({
        clinicId,
        userId,
        action: "invoice.payment",
        entityType: "Invoice",
        entityId: invoice.id,
        changes: { amount, applyCredit, newStatus },
        ipAddress: request.ip,
      });

      return { success: true, data: updated };
    },
  );
}
