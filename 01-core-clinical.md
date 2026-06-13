# Module 01 — Core Clinical

> Patient management, scheduling, clinical notes, billing, and payments. This is the heart of the system.

---

## 1.1 Patient Management

### Purpose
Maintain complete records of every animal under care and link them to their owner (client). Multi-pet households are first-class — one client can have many patients.

### Data Model
- **Animal record:**
  - Name
  - Species (canine, equine, feline, other)
  - Breed
  - Date of birth / age
  - Sex
  - Color
  - Weight (with history tracking)
  - Microchip ID (optional)
  - Status (active, deceased, transferred, inactive)
- **Owner/Client link:**
  - Each animal belongs to one primary client account
  - Multiple animals can share a client account
- **Medical history:**
  - Veterinary diagnosis records
  - Medications
  - Allergies
  - Surgeries
  - Prior conditions
- **Primary veterinarian:**
  - Name, clinic, phone, email
  - Permission flag for sharing notes
- **Treatment goals:**
  - Free-text and structured fields
  - Updated over time
- **Documentation:**
  - Uploaded files (vet records, X-rays, photos, video)
  - Each file tagged with date and description

### Visit Tracker
- Total visits to date (count)
- Current visit number (e.g., "Visit 3 of estimated 8")
- Estimated total visits for current care plan (set by provider, editable)
- Visual progress indicator on patient chart
- Updates automatically as visits are logged

### Deceased Flag
- Mark patient as deceased with date
- Automatically excludes from all automated email campaigns (reactivation, birthday, etc.)
- Patient record retained for historical reporting

---

## 1.2 Appointment Scheduling

### Purpose
Provide a calendar interface that handles both direct booking and request-based scheduling, with two-way sync to providers' personal calendars.

### Calendar Integration (Two-Way Sync)
- **Google Calendar** — full read/write sync
- **Outlook / Microsoft 365** — full read/write sync
- **Apple Calendar (iCloud)** — full read/write sync
- Each provider connects their own calendar(s) via OAuth
- Vitalis appointments appear on personal calendars and vice versa (configurable per provider)

### Scheduling Modes (Per Clinic, Set by Admin)
- **Mobile-only** — clients submit appointment *requests* that providers approve and slot
- **Office-only** — clients can book directly into available slots
- **Hybrid** — admin defines hours/days where direct booking is allowed vs. request-only

### Appointment Properties
- Patient (animal)
- Client (owner)
- Provider assigned
- Appointment type (initial eval, routine adjustment, laser session, reexam, soft tissue work, kinesio tape, telehealth, etc.)
- Date and time
- Duration
- Location (clinic name or mobile address)
- Status (requested, confirmed, completed, no-show, cancelled)
- Notes for the appointment (separate from clinical notes)

### Reminders
- Automated reminders to clients (configurable: 24h, 2h, custom)
- Provider reminders for upcoming appointments
- Delivery: email, in-app push notification

### Full Clinic View
- Providers can see their own schedule AND the full clinic schedule
- Each appointment shows provider assignment
- Color-coded by provider or appointment type

---

## 1.3 Clinical Notes & Treatment Documentation

This is the most important and most differentiated module in the system. Get this right.

### SOAP Tab Structure
Notes are organized into four tabs:
- **Subjective** — what the owner reports, observed behavior
- **Objective** — measurements, exam findings, test results
- **Assessment** — diagnosis, problem list, current status of chief complaint
- **Plan** — treatment performed, recommendations, next visit timing

Each tab shows a different set of macro buttons relevant to that section.

### Macro System

**Macro buttons** pre-fill the majority of common note text and allow rapid documentation.

- **Two tiers of macros:**
  - **System defaults** — built-in templates Vitalis ships with (configurable starting point)
  - **Provider custom** — each provider builds and edits their own macro library
- **Macro components:**
  - A title (shown on the button)
  - Pre-written body text
  - Variable insertion points (see below)
  - Tab assignment (Subjective, Objective, Assessment, or Plan)

### Variable Input System (The Differentiator)

Within macro body text, providers insert **variables** that render as clickable hyperlinks in the final note:

- **Variable types:**
  - **Multiple choice** — e.g., "better / worse / unchanged"
  - **Fill-in-the-blank** — short text input
  - **Numeric scale** — e.g., pain 0–10, mobility 1–5
  - **Date picker**
  - **Anatomical region picker** — predefined options
- **Behavior:**
  - In the note editor, each variable shows as a styled hyperlink with its current value
  - Clicking the hyperlink opens a small inline picker/dialog
  - Selection updates the note **in real time** — no save needed to see the change
  - Variables persist their type and options when notes are duplicated via SALT (below)

### Same As Last Treatment (SALT)

- Button labeled "SALT" or "Same As Last Treatment" inside the note editor
- Opens a **modal window** listing every prior appointment for the active patient
- Each row displays:
  - Date
  - Appointment type (initial eval, routine, reexam, etc.)
  - Provider who performed it
  - Brief preview of the chief complaint or note title
- Provider scrolls and clicks the appointment they want to copy
- The full note from that appointment is loaded into the new note
- Variables remain interactive (hyperlinked) so the provider can quickly update just what changed

### Orthopedic / Neurological Test Library
- Built-in library of standard ortho and neuro tests (selectable as macro elements)
- Each test has predefined possible findings (normal, decreased, exaggerated, painful, etc.)
- Tests render in the note with hyperlinked results
- Customizable — providers can add their own tests

### Chief Complaint Tracking
- Captured at intake (or initial exam)
- Displayed prominently on the patient chart
- On every subsequent treatment note, provider is prompted:
  - "Is the chief complaint still present?"
  - Dropdown: Resolved / Improved / Unchanged / Declined / Worsened
  - Severity scale update (provider-defined)
  - Button: "Mark Resolved"
- All status changes feed into the outcomes report

### Note Lifecycle
- Draft → Signed → Locked
- Once signed, edits require an addendum (timestamped, attributed to editing provider)
- Locked notes cannot be deleted (only marked as voided with reason)

---

## 1.4 Billing & Invoicing

### Client-Level Billing
- All invoices roll up to the **client account**, not the individual patient
- A single client statement covers every animal they own
- Each line item shows which animal received which service
- Single payment can settle multiple pets' charges at once

### Credit Management
- Overpayments and refunds create a credit balance on the **client account**
- Credit is usable across any of the client's pets
- Credit balance shown on:
  - Client dashboard (client portal)
  - Patient chart sidebar (provider view)
  - Invoice/checkout flow (auto-applies if available)
- Manual credit issuance by admin (e.g., goodwill credit)

### Package Tracking
- Predefined packages (e.g., "5 Adjustments + 3 Laser Sessions")
- Packages defined per clinic by admin
- Pricing per package
- Tied to the **client account** — usable across pets
- Visual tracker shows: purchased / used / remaining for each service type
- Auto-deducts when matching service is rendered
- Expiration date configurable (or no expiration)
- Refund/transfer rules configurable per clinic

### Invoice Generation
- Auto-generated when appointment marked complete (with all services rendered)
- Provider can edit before sending
- Sent to client via email and visible in client portal
- Includes itemized services per pet, package usage, credit applied, balance due

---

## 1.5 Card Processing & Payments

### Pluggable Processor Architecture
- Internal `PaymentProvider` interface
- Out-of-box implementations:
  - **Stripe** (with Stripe Connect for multi-tenant)
  - **Square**
- Custom integration framework for boutique/local processors (clinic supplies API credentials)
- Admin selects active processor in clinic settings
- All payment flows in the app route through the active provider — UI is identical

### Payment Capabilities
- One-time card-not-present (online checkout)
- Card-present terminal payments (Stripe Terminal, Square Terminal where supported)
- Card-on-file with stored payment methods (PCI-compliant tokenization)
- Recurring billing (for packages, subscriptions)
- Automatic billing on appointment completion (opt-in per client)
- Payment links sent via email or SMS

### Payment Flows
- **In-clinic checkout** — provider/admin completes payment via app
- **Field payment** — mobile provider charges card on tablet at point of service
- **Client self-pay** — client pays invoice from portal
- **Auto-charge** — saved card automatically charged when invoice generated

---

## Module Dependencies

- Patient Management → no dependencies; build first
- Appointment Scheduling → depends on Patient Management + User/Provider records
- Clinical Notes → depends on Patient Management + Appointment Scheduling
- Billing → depends on Patient Management + Appointment Scheduling
- Payments → depends on Billing

## Key Design Decisions to Lock Before Building

1. Macro variable rendering — HTML vs. structured JSON document model? **Recommendation: structured JSON document (Lexical or ProseMirror), rendered to HTML for display.**
2. Note storage — versioned or addendum-only? **Recommendation: versioned with full history.**
3. Package usage attribution — FIFO or manual selection? **Recommendation: FIFO with override.**
