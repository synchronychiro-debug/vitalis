# Vitalis EHR

Practice management and EHR platform for animal chiropractors.

## Project Structure

Turborepo monorepo with npm workspaces:

- `apps/api` — Fastify + TypeScript + Prisma backend
- `apps/web` — React web dashboard (Phase 2)
- `apps/mobile` — React Native app (Phase 7)
- `apps/desktop` — Tauri desktop app (Phase 8)
- `packages/types` — Shared TypeScript type definitions
- `packages/core` — Shared business logic and validation
- `packages/api-client` — API client for frontend apps
- `packages/ui` — Shared React UI components

## Commands

- `npm run dev` — Start all dev servers
- `npm run build` — Build all packages
- `npm run typecheck` — TypeScript checking across all packages
- `npm run test` — Run all tests
- `npm run db:migrate` — Run Prisma migrations
- `npm run db:generate` — Generate Prisma client
- `npm run db:push` — Push schema to database
- `npm run db:studio` — Open Prisma Studio

## Local Development

```bash
# Start Postgres + Redis
docker compose up postgres redis -d

# Install dependencies
npm install

# Generate Prisma client and push schema
npx prisma generate --schema=apps/api/prisma/schema.prisma
npx prisma db push --schema=apps/api/prisma/schema.prisma

# Seed database
npx tsx apps/api/prisma/seed.ts

# Start API dev server
npm run dev --workspace=apps/api
```

## Architecture Decisions

- All monetary values stored in cents (integer)
- All data scoped by `clinic_id` for multi-tenancy
- JWT access tokens (15min) + refresh tokens (7 days)
- Prisma ORM with PostgreSQL
- REST API versioned at `/api/v1/`
- RBAC: SUPER_ADMIN, ADMIN, PROVIDER, STAFF, CLIENT

## Spec Documents

See the markdown files in the repo root (01-vision.md through 06-strategic-considerations.md) for the full product specification.
