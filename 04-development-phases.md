# 04 — Development Phases

> A pragmatic, sequenced plan that gets you to a usable system as fast as possible, then layers in commercial-grade polish and advanced features. Each phase has clear deliverables and a definition of done.

---

## Phase 0 — Foundation & Setup (Week 1–2)

**Goal:** Repo, infrastructure, and toolchain ready for productive AI-assisted development.

### Deliverables
- GitHub repository structured as monorepo (Turborepo or Nx)
- Package skeletons: `api`, `mobile`, `desktop`, `core`, `types`, `api-client`, `ui`
- AWS account configured with Terraform/CDK for infrastructure as code
- Development environment Docker compose (Postgres + Redis + API + frontend dev servers)
- CI/CD pipeline (GitHub Actions) with linting, testing, build checks
- Authentication infrastructure provisioned (Auth0 or Cognito)
- Database schema scaffolding and migration tooling (Prisma)
- Style guides, commit conventions, and PR templates

### Definition of Done
- New developer (or AI agent) can clone the repo and have a working local environment in <30 minutes
- Sample "hello world" endpoint deploys to staging successfully
- All scaffolding documented in `/docs`

---

## Phase 1 — Core Data Model & API (Week 3–6)

**Goal:** Backend API with patient, client, user, appointment, and clinic data models. No UI yet.

### Deliverables
- Database schema for: clinics, users, clients, patients, appointments, services, packages
- REST API endpoints (CRUD) for all above
- Role-based access control enforced at API layer
- Authentication flow (login, refresh, logout, password reset)
- Multi-tenancy enforced (clinic_id scoping everywhere)
- API documentation (OpenAPI/Swagger)
- Comprehensive API integration tests (>80% coverage)

### Definition of Done
- All endpoints documented and tested
- API deployed to staging
- Postman/Insomnia collection available for manual testing

---

## Phase 2 — Provider Web Dashboard (Week 6–10)

**Goal:** A functional web-based provider dashboard. This becomes the temporary primary interface until native apps are built. Why web first? Fastest iteration, easiest debugging, validates the API.

### Deliverables
- React + TypeScript web application
- Login and authentication flows
- Provider dashboard with today's schedule
- Patient list and patient detail views
- Client list and client detail views
- Basic appointment scheduling UI (create, edit, cancel)
- Admin settings UI for clinic configuration
- Provider management UI

### Definition of Done
- Provider can log in, view schedule, manage patients/clients, schedule appointments
- Admin can configure clinic, add providers, set permissions
- Dr. Philip can use the web app to begin documenting test patients

---

## Phase 3 — Clinical Notes Engine (Week 10–16)

**Goal:** The heart of the system — macro-based notes with hyperlinked variables and SALT.

### Deliverables
- Note data model (versioned, addendum-supported)
- Macro template system (system defaults + provider custom)
- SOAP tab structure
- Variable input types (multiple choice, fill-in-blank, numeric scale, date, anatomical picker)
- Hyperlinked variable rendering with inline editing
- Real-time variable updates in the note editor
- SALT modal (appointment selector for note duplication)
- Orthopedic/neurological test library
- Chief complaint tracking and outcome status updates
- Note signing and locking workflow
- PDF export of notes

### Definition of Done
- Provider can document a complete visit in <2 minutes using macros
- SALT pulls previous notes correctly with all variables intact
- Outcome tracking captures chief complaint progression visit-to-visit
- Dr. Philip uses the system for real visits at Synchrony

---

## Phase 4 — Billing, Payments, Packages (Week 16–22)

**Goal:** Money in and out, with multi-pet client billing.

### Deliverables
- Invoice generation from completed appointments
- Client-level invoice rollup across pets
- Package definitions and tracking
- Credit management
- Stripe integration (Stripe Connect for multi-tenant)
- Square integration
- `PaymentProvider` interface for future processors
- Payment flows: in-clinic checkout, online client portal, card-on-file auto-charge
- Accounts receivable reporting

### Definition of Done
- Synchrony processes real payments through the system
- Package usage tracked accurately across multi-pet households
- AR reporting matches accountant's books

---

## Phase 5 — Client Portal (Week 18–24, parallel with Phase 4)

**Goal:** Animal owners can self-serve.

### Deliverables
- Client login and dashboard
- Multi-pet management
- Customizable intake form for new pets (with admin form builder)
- View clinical notes (read-only)
- View visit history and visit tracker
- View invoices and pay online
- View package usage and credits
- Submit appointment requests or book directly (based on clinic mode)
- Upload documents

### Definition of Done
- Synchrony clients use the portal in production
- New pet intake completed entirely through portal in <5 minutes

---

## Phase 6 — Communication Infrastructure (Week 22–28)

**Goal:** Messaging, automated email, calendar sync.

### Deliverables
- In-app messaging (provider-provider, provider-admin, provider-client)
- AWS SES configured for outbound email
- Email template engine with merge fields
- Automated email triggers: confirmations, reminders, birthdays, reactivations
- Reactivation campaign with smart suppression (upcoming appointment check, deceased flag)
- Calendar sync: Google, Outlook, Apple (OAuth + two-way sync)
- Appointment reminders (email + push)
- Push notification infrastructure

### Definition of Done
- All Synchrony scheduling flows through the system
- Email campaigns send reliably with proper deliverability (SPF, DKIM, DMARC configured)
- Calendar sync works without duplicates or missed appointments

---

## Phase 7 — Native Mobile App (Week 24–34)

**Goal:** Replace the web dashboard with a polished native iOS/Android app for field use.

### Deliverables
- React Native app for iOS and Android
- Tablet-optimized layouts
- All Phase 1–6 features ported to mobile
- Offline mode with local SQLite + sync engine
- Camera integration (photos, document scanning)
- Card-present payment integration (Stripe Terminal, Square SDK)
- Push notifications
- Biometric login

### Definition of Done
- Dr. Philip uses the mobile app exclusively for field visits
- Offline sync handles a full day in a no-signal area without data loss
- App Store and Google Play approval received

---

## Phase 8 — Native Desktop App (Week 28–34, parallel with Phase 7)

**Goal:** Desktop app for office-based use and admin work.

### Deliverables
- Tauri-based desktop app for Windows and Mac
- All Phase 1–6 features ported to desktop
- Optimized for larger screens and admin workflows
- Native installers (Windows MSI, Mac .dmg)
- Auto-update mechanism

### Definition of Done
- Admin tasks (reporting, intake form building) significantly faster on desktop than web
- Installers signed and notarized for both platforms

---

## Phase 9 — Reporting & Analytics (Week 32–38)

**Goal:** Full reporting suite with custom report builder.

### Deliverables
- Primary dashboard with date range selector
- Week-by-week schedule health view
- All revenue reports (provider, species, service type, etc.)
- Patient outcome reports
- Financial reports (AR aging, collections, etc.)
- Customizable report builder
- Scheduled reports (email me weekly)
- Audit log viewer
- Data export (CSV, PDF)

### Definition of Done
- Dr. Philip can answer any business question about Synchrony from the system
- Reports are accurate to the cent and to the visit

---

## Phase 10 — CRM Integrations (Week 36–42)

**Goal:** Connect with the marketing platforms practices already use.

### Deliverables
- ActiveCampaign adapter
- HighLevel adapter
- Mailchimp adapter
- `MarketingProvider` interface and adapter framework
- Two-way sync (contacts out, engagement events in)
- Field mapping configuration UI
- Webhook receiver for external integrations
- Zapier integration (post-launch consideration)

### Definition of Done
- Synchrony's ActiveCampaign is fully integrated and syncing reliably
- Adding a new CRM adapter takes <2 weeks of focused work

---

## Phase 11 — AI Features (Week 40–48)

**Goal:** Layer intelligence on top of the stable platform.

### Deliverables
- Schedule gap detection and patient suggestion
- At-risk patient detection
- Documentation assistance (note suggestions, summarization)
- Voice-to-text dictation for notes
- Cost monitoring and rate limiting for AI usage

### Definition of Done
- AI suggestions improve scheduling utilization by measurable amount
- Note dictation works reliably in field conditions

---

## Phase 12 — Polish, Security Hardening, Commercial Launch Prep (Week 46–52)

**Goal:** Take the working system to commercial-grade quality.

### Deliverables
- Comprehensive security audit (external penetration test)
- Performance optimization (load testing, query optimization)
- UI/UX refinement based on real usage
- Onboarding flow for new clinics
- Documentation: user guide, admin guide, API docs
- Help center and support tooling
- Pricing and billing for Vitalis SaaS itself
- Marketing site
- Beta program with 5–10 clinics
- Bug bounty program launch

### Definition of Done
- Vitalis is ready to sell to other practices
- First paying customer outside of Synchrony onboarded

---

## Critical Sequencing Rules

1. **Phase 0 and Phase 1 must complete before anything else.** Skipping foundation creates compounding debt.
2. **Web dashboard (Phase 2) before mobile (Phase 7).** Validating UX and API in a browser is 5x faster than on devices.
3. **Clinical notes (Phase 3) is the make-or-break feature.** Do not rush it. This is where Vitalis wins or loses against the competition.
4. **Billing (Phase 4) before client portal (Phase 5).** Clients need something real to pay for.
5. **AI (Phase 11) goes LAST.** AI on top of a broken foundation is just an expensive broken foundation.
6. **Security hardening (Phase 12) is non-negotiable before commercial sales.** Animals don't have HIPAA, but data breaches still destroy businesses.

## Estimated Timeline

- **MVP for Synchrony internal use:** End of Phase 6 (~28 weeks / 7 months)
- **Mobile + Desktop apps ready:** End of Phase 8 (~34 weeks / 8 months)
- **Commercial-ready:** End of Phase 12 (~52 weeks / 12 months)

These estimates assume one to two full-time-equivalent developers (human or AI-assisted). Solo AI-assisted development with active review/correction realistically pushes commercial-ready to 18–24 months.
