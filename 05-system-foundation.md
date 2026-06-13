# Module 05 — System Foundation

> The technical bedrock: database, API, mobile and desktop apps, cloud infrastructure, and offline support.

---

## 5.1 Database

### Primary Database
- **Engine:** PostgreSQL (latest stable)
- **Hosting:** AWS RDS (Multi-AZ for production)
- **Encryption:** at rest and in transit
- **Backups:** automated daily, point-in-time recovery (7 days minimum)
- **Replication:** read replica for reporting queries (post-MVP)

### Schema Approach
- Strict relational schema for core entities (clients, patients, appointments, notes, invoices)
- JSONB columns for flexible/customizable data:
  - Intake form responses (form definition varies per clinic)
  - Macro variable values within notes
  - Custom fields on patient/client records
- Migrations managed via Prisma (or similar) — versioned, reviewable, reversible

### Multi-Tenancy
- All data scoped to a `clinic_id`
- Every query filters by `clinic_id` at the API layer
- Database-level row security (Postgres RLS) as defense-in-depth
- One clinic's data is never visible to another

### Data Retention
- Active patient records: indefinite (until manual archival)
- Deceased patients: retained indefinitely (for historical reporting)
- Audit logs: retained per clinic policy (default 7 years)
- Deleted records: soft-delete by default; hard-delete after 90 days

---

## 5.2 Mobile App

### Platforms
- **iOS:** iPhone and iPad (iPadOS 16+, iOS 16+)
- **Android:** phones and tablets (Android 10+)
- Tablet-first design (primary use case for field practitioners)
- Responsive layouts for phone form factors

### Technology
- React Native with TypeScript
- Shared `@vitalis/core` package for business logic, API client, types

### Features
- Full EHR functionality (patient records, notes, scheduling, billing)
- Macro-based note entry with hyperlinked variables
- Camera integration (photos, document scanning)
- Card-present payments (where supported)
- Push notifications
- Offline mode (see 5.5)
- Biometric login (Face ID, Touch ID, Fingerprint)
- Voice-to-text for note dictation (post-MVP)

---

## 5.3 Desktop App

### Platforms
- **Windows:** Windows 10+ (x64, ARM64)
- **Mac:** macOS 12+ (Intel and Apple Silicon)
- Native distribution (installer for Windows, .dmg for Mac)

### Technology
- Tauri (Rust + web frontend) — preferred for size and performance
- Electron acceptable fallback if Tauri ecosystem gaps prove blocking
- Shared `@vitalis/core` package and shared UI components with web

### Features
- Full EHR functionality optimized for larger screens
- Multi-window support (notes in one window, schedule in another)
- Keyboard shortcuts for power users
- Printer integration (invoices, notes)
- Better suited for admin tasks (reports, settings, intake form builder)

---

## 5.4 API Server

### Architecture
- Node.js + TypeScript
- Express or Fastify framework (Fastify preferred for performance)
- Prisma ORM
- RESTful endpoints, versioned (`/api/v1/...`)
- OpenAPI/Swagger documentation auto-generated from code

### Containerization
- Docker images for all services
- AWS ECS (Fargate) for production hosting
- Auto-scaling based on CPU/memory
- Health checks and graceful shutdown

### Background Jobs
- Job queue: AWS SQS or BullMQ (Redis-backed)
- Async tasks: email sends, report generation, AI processing, CRM syncs, scheduled campaigns
- Retry logic with exponential backoff
- Dead letter queue for failed jobs

### Caching
- Redis (AWS ElastiCache) for:
  - Session data
  - Frequently-accessed read data (clinic settings, user permissions)
  - Rate limiting counters

### Search
- Postgres full-text search for MVP
- Migrate to OpenSearch / Elasticsearch when scale demands

---

## 5.5 Offline Support

### Local Database
- Each mobile and desktop app maintains a local SQLite database
- Subset of the cloud database relevant to the user (their patients, schedule, etc.)
- Encrypted at rest using OS-level encryption (Keychain on Mac/iOS, Keystore on Android, DPAPI on Windows)

### Sync Engine
- On app launch: full sync (delta from last sync timestamp)
- Periodic background sync (every 5 minutes when online)
- Manual sync trigger available to user
- Writes go to local DB immediately; queued for upload when online
- Each write tagged with client-generated UUID + timestamp for conflict resolution

### Conflict Resolution
- **Default:** server-wins (last write to server is authoritative)
- **Clinical notes:** manual merge dialog if conflicts detected
- **Appointments:** server-wins (admin/scheduling system has authority)
- All conflicts logged for audit

### User Indicators
- Status indicator: Online / Offline / Syncing / Sync Error
- Pending changes count visible
- Manual sync button always accessible

---

## 5.6 Cloud Infrastructure

### AWS Services
| Service | Purpose |
|---|---|
| RDS (PostgreSQL) | Primary database |
| ECS Fargate | API server containers |
| S3 | File storage |
| CloudFront | CDN |
| Route 53 | DNS |
| SES | Outbound email |
| SQS | Background job queue |
| ElastiCache (Redis) | Caching and sessions |
| Cognito or Auth0 | Authentication |
| Secrets Manager | API keys and credentials |
| CloudWatch | Logs and monitoring |
| WAF | Web application firewall |
| Certificate Manager | TLS certificates |

### Environment Strategy
- **Development:** local Docker compose, hot reload
- **Staging:** mirror of production, smaller instance sizes
- **Production:** multi-AZ, auto-scaling, monitoring + alerting

### Infrastructure as Code
- Terraform or AWS CDK
- All infrastructure changes via pull request and review
- No clickops in production

### Deployment
- CI/CD via GitHub Actions
- Automated tests must pass before deploy
- Blue/green or rolling deployment to ECS
- Database migrations run pre-deploy in safe order
- Rollback capability within 5 minutes

---

## 5.7 Security

### Application Security
- HTTPS/TLS only (TLS 1.2+)
- HSTS, secure cookies, CSRF protection
- Input validation on every API endpoint
- Parameterized queries (no SQL injection)
- Rate limiting per user, per IP
- DDoS protection via AWS WAF and CloudFront

### Authentication Security
- Password hashing: bcrypt or argon2
- MFA support (TOTP)
- Session tokens: short-lived JWTs + refresh tokens
- Token revocation list

### Data Security
- Encryption at rest (RDS, S3, ElastiCache)
- Encryption in transit (TLS)
- Database access restricted to API server security group
- Secrets in AWS Secrets Manager, never in code or env files committed to git

### Audit & Compliance
- Comprehensive audit log (see Module 04)
- Regular security scans (Snyk, GitHub Dependabot, AWS Inspector)
- Penetration testing before commercial launch
- Bug bounty program post-launch (Phase 5+)

---

## 5.8 Code Sharing Strategy

### Shared Packages
- `@vitalis/core` — business logic, validation, calculations
- `@vitalis/types` — TypeScript types shared across all apps and API
- `@vitalis/api-client` — generated client for the REST API
- `@vitalis/ui` — shared React components (used by web, React Native via React Native Web where appropriate)

### Monorepo
- Single git repository with multiple packages
- Tool: Turborepo or Nx
- Shared CI/CD pipelines
- Coordinated versioning

### Code Reuse Targets
- ~85% of business logic shared across all platforms
- ~60% of UI components shared between desktop (Tauri) and web admin
- ~70% of UI components shared between mobile platforms (iOS + Android via React Native)

---

## Module Dependencies

- This module is the foundation for ALL other modules
- Build database schema, API skeleton, auth, and basic deployment FIRST
- Mobile and desktop apps can begin in parallel after API skeleton exists
- Offline support is added late in MVP (not in Phase 1)
