# 02 — Architecture & Tech Stack

## Architecture Overview

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Mobile App     │  │   Desktop App    │  │   Web Browser    │
│ (iOS / Android)  │  │ (Windows / Mac)  │  │  (admin fallback)│
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                       ┌───────▼────────┐
                       │   REST API     │
                       │  (Node.js +    │
                       │   TypeScript)  │
                       └───────┬────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
│ PostgreSQL  │         │  AWS S3     │         │ Background  │
│  Database   │         │  (files,    │         │  Job Queue  │
│  (AWS RDS)  │         │   images)   │         │ (emails,    │
└─────────────┘         └─────────────┘         │  reports)   │
                                                └─────────────┘
                               │
                  ┌────────────┴────────────┐
                  │   External Integrations │
                  ├─────────────────────────┤
                  │ • Stripe, Square        │
                  │ • Google/Apple/Outlook  │
                  │   Calendars             │
                  │ • ActiveCampaign,       │
                  │   HighLevel, Mailchimp  │
                  │ • Zoom                  │
                  │ • OpenAI (AI assist)    │
                  └─────────────────────────┘
```

## Tech Stack Recommendations

### Backend (API Server)

**Recommendation: Node.js + TypeScript + Express (or Fastify) + Prisma ORM**

Rationale:
- TypeScript shares types with the frontend, reducing bugs and dev time
- Massive ecosystem of payment, calendar, and CRM SDKs
- Easy hiring pool when scaling the team
- Prisma ORM gives type-safe database access and auto-generated migrations
- Same language across frontend and backend = code sharing for validation logic

### Database

**Recommendation: PostgreSQL hosted on AWS RDS**

Rationale:
- Relational structure matches the highly-related nature of clinical data (patients → owners → visits → notes → invoices)
- Strong support for complex queries needed for reporting/analytics
- JSONB columns handle flexible data (e.g., customizable intake form responses) without schema changes
- AWS RDS handles backups, replication, and patching

### Frontend — Shared Strategy

**Recommendation: React Native for mobile + Tauri (or Electron) for desktop, with a shared business logic package**

Rationale (this matters — read it carefully):
- React Native lets you build iOS + Android from one codebase (~90% code reuse)
- Tauri (lightweight, fast) or Electron (more mature, heavier) wraps a web-style UI for Windows + Mac
- A shared internal package (`@vitalis/core`) holds business logic, API client, types, and validation — used by every app
- This is *significantly* cheaper than building four separate native apps and gives you 70–85% code reuse across all four platforms

**Alternative considered:** Flutter (Dart) would also share code across all four platforms in a single language. Trade-off is a smaller hiring pool and weaker desktop story. React Native + Tauri is the more pragmatic choice for this project.

### Offline Support

**Recommendation: Local SQLite database + sync layer**

- Each mobile/desktop app has a local SQLite database
- On launch and at intervals, syncs with the cloud database via the API
- Writes go to local DB immediately, then queue for upload when online
- Conflict resolution: server-wins by default, with optional manual merge for clinical notes
- Provider sees clear "offline" / "syncing" / "online" indicators

### File Storage

**Recommendation: AWS S3 with signed URLs**

- All uploaded files (vet records, photos, documents) stored in S3
- Database stores references (file IDs and metadata), not the files themselves
- Signed URLs for time-limited access, even from offline-cached metadata

### Authentication

**Recommendation: Auth0 or AWS Cognito**

- Handles login, password reset, multi-factor authentication, and session management
- Saves significant engineering time vs. rolling our own
- Built-in support for OAuth flows needed for Google Calendar / Outlook integrations

### Hosting

**Recommendation: AWS (as specified)**

Core services:
- **AWS RDS** — PostgreSQL database
- **AWS ECS or App Runner** — API server containers
- **AWS S3** — file storage
- **AWS CloudFront** — CDN for static assets and API caching
- **AWS SES** — outbound transactional email
- **AWS SQS** — background job queue
- **AWS CloudWatch** — logging and monitoring

### Payments

**Recommendation: Stripe Connect + Square SDK, behind a unified internal `PaymentProvider` interface**

- All payment code routes through one internal interface
- Adding a new processor = implementing the interface, no other code changes
- Stripe Connect specifically enables multi-tenant SaaS billing (each clinic gets its own merchant account)

### CRM Integrations

**Recommendation: Webhook + API adapter pattern**

- One internal `MarketingProvider` interface defines required operations (sync contacts, trigger campaign, etc.)
- Each CRM (ActiveCampaign, HighLevel, Mailchimp) implements the interface
- New CRMs added by writing new adapters
- Outbound webhooks from Vitalis trigger CRM workflows; inbound webhooks update Vitalis when emails open or campaigns engage

## API Design Principles

- RESTful with consistent resource naming (`/patients`, `/appointments`, `/notes`)
- JSON request/response with strict TypeScript-validated schemas
- Versioned (`/api/v1/...`) so future versions don't break existing apps
- Authentication via JWT bearer tokens
- Authorization enforced at API layer (every endpoint checks role + ownership)
- Rate limiting per user and per IP
- All requests logged for audit

## Security Baseline

- HTTPS/TLS for all traffic
- Database encryption at rest (AWS RDS native)
- File encryption at rest (S3 native)
- Secrets management via AWS Secrets Manager (no secrets in code)
- Database access only from API server (no public DB endpoint)
- Regular automated security scans (Snyk, GitHub Dependabot)
- Audit log of every data-modifying action

## Important Trade-offs

See `06-strategic-considerations.md` for honest assessment of these choices, including where to push back on scope or sequence decisions.
