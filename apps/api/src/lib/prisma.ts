import { PrismaClient, Prisma } from "@prisma/client";

const basePrisma = new PrismaClient({
  log:
    process.env["NODE_ENV"] === "development"
      ? ["query", "error", "warn"]
      : process.env["NODE_ENV"] === "test"
        ? []
        : ["error"],
});

// Soft-delete extension: automatically filters out deleted records on
// findFirst / findMany / count and converts delete → update(deletedAt).
export const prisma = basePrisma.$extends({
  query: {
    user: {
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async delete({ args }) {
        return basePrisma.user.update({
          ...args,
          data: { deletedAt: new Date() },
        }) as any;
      },
      async deleteMany({ args }) {
        return basePrisma.user.updateMany({
          ...args,
          data: { deletedAt: new Date() },
        }) as any;
      },
    },
    client: {
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async delete({ args }) {
        return basePrisma.client.update({
          ...args,
          data: { deletedAt: new Date() },
        }) as any;
      },
      async deleteMany({ args }) {
        return basePrisma.client.updateMany({
          ...args,
          data: { deletedAt: new Date() },
        }) as any;
      },
    },
    patient: {
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: args.where?.deletedAt ?? null };
        return query(args);
      },
      async delete({ args }) {
        return basePrisma.patient.update({
          ...args,
          data: { deletedAt: new Date() },
        }) as any;
      },
      async deleteMany({ args }) {
        return basePrisma.patient.updateMany({
          ...args,
          data: { deletedAt: new Date() },
        }) as any;
      },
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;
