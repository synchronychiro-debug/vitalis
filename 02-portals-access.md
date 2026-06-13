# Module 02 — Portals & Access Control

> Three distinct user experiences (Provider, Client, Admin) sitting on top of a unified role-based access control system.

---

## 2.1 Provider Portal

### Login
- Email + password authentication
- Optional multi-factor authentication (admin can require for the clinic)
- Provider-specific credentials per clinic

### Personal Dashboard
- Today's appointments (provider's own schedule)
- Full clinic schedule for today (with provider attribution on each appointment)
- Quick stats: appointments today, appointments this week, revenue this month
- Recent notes drafted (incomplete documentation)
- Outstanding messages
- Pending appointment requests (if mobile-mode clinic)

### Patient & Client Access
- Full searchable patient list across the clinic
- Full searchable client list across the clinic
- Quick filters: my patients, by species, recent visits, by status

### Schedule Management
- Add appointments to schedule
- Reschedule and cancel
- Mark no-shows
- Block off time (vacation, lunch, travel)
- See colleague schedules (read-only by default; configurable by admin)

### Revenue & Performance
- Personal revenue dashboard (date range selectable)
- Revenue by species
- Patient outcome metrics (own patients)
- Visit count and trends

### Permissions Boundary
Providers CANNOT:
- Access banking or payment processor credentials
- Modify clinic settings, hours, or address
- Add/remove provider accounts
- Change permissions or roles
- View other providers' personal performance dashboards (unless granted by admin)

Providers CAN:
- See aggregate clinic metrics (if granted)
- View all patient and client records
- Document on any patient
- Manage their own schedule and appointments
- Send messages to anyone in the clinic

---

## 2.2 Client Portal

### Login
- Email + password authentication
- Optional MFA (clinic admin can require)

### Animal/Patient Management
- View all of their animals on one dashboard
- Add new animals to their account
- View each animal's history, notes, visit count

### Multi-Step Intake Form (When Adding a New Pet)

**Step 1: Demographics**
- Name
- Species
- Breed
- Date of birth
- Sex (intact/altered)
- Color
- Current weight
- Microchip ID (optional)

**Step 2: Health Background**
- Current chief complaint
- Duration of issue
- What treatments have been tried
- Current medications
- Allergies
- Primary veterinarian (name, clinic, phone)
- Document upload (vet records, X-rays, photos)

### Intake Form Customization (Admin-Controlled)
- Admin can add, remove, reorder, and modify any question
- Defaults ship with the system but are fully editable
- Conditional logic supported (e.g., "if species = horse, show riding discipline question")
- Mandatory vs. optional flags per question

### Clinical Access (Client View)
- View all clinical notes for their animals (read-only)
- See visit history with dates and types
- See visit tracker (e.g., "Visit 3 of 8")
- Download notes as PDF

### Appointment Management
- Behavior depends on clinic's scheduling mode:
  - **Direct booking enabled** → see available slots, click to book
  - **Request-only** → submit request with preferred dates/times, await provider confirmation
  - **Hybrid** → see which slots allow direct booking vs. requests
- View upcoming and past appointments
- Cancel or reschedule (subject to clinic policy)

### Billing & Payments (Client View)
- See total balance across all their animals
- View itemized invoices
- See package usage and remaining sessions
- See credit balance
- Pay invoices online (uses clinic's active payment processor)
- Save payment methods for future charges

### Document Upload
- Upload any time (not just at intake)
- Tag documents with type (vet record, X-ray, photo, video, other)
- Notes/description per document

---

## 2.3 Admin Dashboard

### Login
- Email + password authentication
- MFA strongly recommended (can be forced for admin role)

### Provider Management
- Add, edit, disable, delete provider accounts
- Assign role and permission level
- Reset passwords
- View provider performance and revenue
- Set provider-specific overrides (e.g., this provider can view all financials)

### Clinic Settings
- Clinic name, address, phone, hours
- Logo and branding (colors, header image)
- Scheduling mode (mobile, office, hybrid + time windows for each)
- Time zone
- Default appointment durations
- Cancellation and no-show policies

### Financial Settings
- Banking and payment processor credentials
- Active payment processor selection
- Custom processor configuration (for boutique processors)
- Tax settings
- Currency and locale

### Service & Package Setup
- Define service types (adjustment, laser, PEMF, soft tissue, etc.)
- Define pricing per service
- Build packages (combinations of services with bundle pricing)
- Set package expiration rules
- Set automated discount rules (e.g., 10% off for multi-pet households)

### Intake Form Builder
- Visual drag-and-drop builder for client intake form
- Add, remove, reorder questions
- Set field types (text, multiple choice, file upload, etc.)
- Conditional logic
- Required vs. optional

### Marketing & Communications Settings
- Email templates and automation triggers
- In-app messaging settings
- Push notification settings
- CRM connection setup (ActiveCampaign, HighLevel, Mailchimp, etc.)
- Reactivation campaign threshold (default + per-patient overrides)

### Reporting & Analytics Access
- Full access to all reports
- Custom report builder
- Audit log viewer

### System Configuration
- User roles and custom role creation
- API key management (for third-party integrations)
- Data export (GDPR-style data portability)
- Backup and restore settings

---

## 2.4 Authentication & Role-Based Access Control

### Authentication
- Email + password (with strong password requirements)
- Optional multi-factor authentication (TOTP, SMS as fallback)
- "Remember this device" for trusted devices
- Password reset via email
- Session timeout configurable per role
- Audit log of all logins (successful and failed)

### Default Roles

| Role | Patient/Client Access | Clinical Notes | Billing | Scheduling | Admin Settings |
|---|---|---|---|---|---|
| **Super Admin** | Full | Full | Full | Full | Full |
| **Admin** | Full | Full (view) | Full | Full | Full except billing credentials |
| **Provider** | Full | Full (own + view others) | View own revenue | Own + view clinic | None |
| **Front Desk / Staff** | Full | View only | Take payments | Full | None |
| **Client** | Own animals only | Own animals only (read) | Own invoices | Own appointments | None |

### Custom Roles
- Admin can create custom roles with granular permissions
- Permissions are defined per resource type (patients, appointments, notes, billing, etc.) and action (view, create, edit, delete)
- Permissions can be scoped (e.g., "view own patients only" vs. "view all patients")

### Permission Enforcement
- Enforced at API level (not just in UI)
- Every API endpoint validates role + ownership
- UI hides features the user cannot access (cleaner UX)
- Failed permission checks logged for audit

---

## Module Dependencies

- Authentication system must be built first
- RBAC framework before any portal
- Provider Portal and Admin Dashboard can be built in parallel
- Client Portal is a separate front-end consuming the same API
