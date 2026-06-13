# Module 03 — Communication & Integration

> In-app messaging, automated email, CRM connectors, video consultation, and AI-assisted scheduling. The connective tissue between Vitalis, practitioners, clients, and the outside world.

---

## 3.1 In-App Messaging

### Message Types
- **Provider ↔ Provider** — internal team messaging
- **Provider ↔ Admin** — internal administrative comms
- **Provider ↔ Client** — direct communication without exposing personal phone numbers
- **System → User** — automated reminders, notifications, alerts

### Features
- Real-time message delivery
- Message threads (organized by conversation)
- Read receipts (configurable)
- Typing indicators
- Search across message history
- File and image attachments
- Reference a patient or appointment inside a message (linked context)

### Push Notifications
- Mobile (iOS, Android) — native push
- Desktop (Windows, Mac) — OS-level notifications
- Per-user notification settings (do not disturb hours, mute conversations, sound preferences)

### Privacy
- Provider's personal phone number never exposed to clients
- All client-provider messages auditable by admin (per clinic policy)
- Messages retained per clinic data retention policy

---

## 3.2 Email System

### Outbound Email Infrastructure
- AWS SES as the sending service
- Custom domain DKIM/SPF setup per clinic (better deliverability, sender shows as clinic name)
- Bounce and complaint tracking
- Suppression list management

### Email Capabilities
- **Manual/one-off email** — provider composes and sends from a patient/client record
- **Transactional emails** — automated, event-driven (appointment confirmation, payment receipt, etc.)
- **Campaign emails** — bulk sends to lists (newsletters, reactivation, promotions)

### Trigger-Based Automated Campaigns
- **Appointment-based triggers:**
  - Booking confirmation (immediate)
  - 24-hour reminder
  - 2-hour reminder
  - Post-visit thank-you / care instructions
  - Missed appointment follow-up
- **Visit count milestones:**
  - First visit (welcome series)
  - Visit 3 (check-in)
  - Visit 10 (loyalty acknowledgment)
  - Customizable per clinic
- **Birthday emails:**
  - Patient birthdays
  - Client birthdays
  - Custom message templates with merge fields
- **Reactivation campaigns:**
  - Triggered after configurable period of no visits (default 4 months)
  - Per-patient threshold override (if patient's care plan is every 3 months or every 6 months)
  - **Smart suppression:** does NOT send if patient has an upcoming appointment within the reactivation window
  - **Deceased patient exclusion:** patients flagged deceased are excluded from all reactivation and birthday campaigns

### Email Templates
- WYSIWYG editor for template design
- Merge fields: client name, animal name, last visit date, balance due, next appointment, etc.
- Clinic branding (logo, colors)
- Mobile-responsive
- Plain-text and HTML versions

### Document Delivery
- Send invoices via email (PDF attached, link to portal)
- Send treatment notes via email (with client permission)
- Send appointment summaries

---

## 3.3 CRM Integrations

### Integration Architecture
- Internal `MarketingProvider` interface defines required operations:
  - Sync contact (create or update)
  - Apply tag / segment
  - Trigger automation
  - Receive engagement events (open, click)
  - Unsubscribe handling
- Each CRM has its own adapter implementing the interface

### Out-of-Box CRM Adapters
- **ActiveCampaign** (priority for Synchrony; well-documented API)
- **HighLevel (GoHighLevel)** (popular with chiropractors)
- **Mailchimp** (widely used baseline)

### Extensibility
- Adapter pattern means new CRMs can be added without core code changes
- Future candidates: HubSpot, Constant Contact, ConvertKit, Klaviyo
- Webhook-based extension allows clinics to connect arbitrary CRMs via Zapier or Make

### Sync Behavior
- **Outbound (Vitalis → CRM):**
  - New client → create contact in CRM
  - Patient added → tag contact with species
  - Appointment completed → trigger CRM automation
  - Tags update based on visit count, package status, outcome status
- **Inbound (CRM → Vitalis):**
  - Email opens, clicks, replies recorded against client record
  - Unsubscribes update Vitalis email permission flag
  - Form submissions (e.g., new lead) can create draft client records

### Configuration
- Admin connects CRM via OAuth or API key in admin dashboard
- Field mapping (which Vitalis field maps to which CRM field)
- Sync direction (one-way out, one-way in, or bidirectional)
- Sync frequency (real-time, hourly, daily)

---

## 3.4 Third-Party Integrations

### Video Consultation
- **Zoom** integration as primary (well-known, trusted)
- Built-in WebRTC video chat as secondary option (no third-party login required)
- Admin can choose Zoom or built-in
- Telehealth appointment type triggers video session creation
- Video link delivered to client via email and visible in client portal
- Recording (optional, with consent) stored in patient record

### Calendar Sync
- See Module 01 (Appointment Scheduling) for details

### Payment Processors
- See Module 01 (Card Processing & Payments) for details

### Future Integration Targets
- E-signature for consent forms (DocuSign, HelloSign, or built-in)
- Pharmacy / supplement ordering platforms
- Laboratory result delivery (Antech, IDEXX, etc.)
- Pet insurance verification (Trupanion, Nationwide)

---

## 3.5 AI-Assisted Scheduling & Practice Intelligence

> AI is a value-add, not a foundation. Build the system without it first, layer AI on once core workflows are stable.

### Scheduling Optimization
- Continuous monitoring of upcoming schedule
- Identify gaps in provider schedules (e.g., 1-hour open slot between two appointments)
- Suggest patients to fill the gap (based on reactivation candidates, package usage, geography for mobile providers)
- Provider sees a "Schedule Suggestions" panel; one click to outreach via email or message

### At-Risk Patient Detection
- AI-driven analysis of visit patterns and outcome data
- Flag patients showing signs of disengagement (longer gaps than usual, declining outcome scores, missed appointments)
- Suggest follow-up outreach with personalized message draft

### Documentation Assistance
- AI-generated note suggestions based on macro selections and visit history
- Auto-summarize a series of visits into a progress report
- Voice-to-text dictation for note entry (mobile field use)

### Pattern Recognition
- Identify common scheduling problems (high no-show patterns, day-of-week imbalances)
- Identify high-value vs. low-margin services by analyzing revenue + time spent
- Suggest pricing or service mix changes

### AI Implementation Notes
- Use OpenAI API (GPT-4 class) or Anthropic Claude API
- All AI suggestions are advisory — provider/admin must approve before action
- AI does NOT auto-send messages or modify schedule without human approval
- Costs scale with usage; build with cost monitoring from day one

---

## Module Dependencies

- In-app messaging is independent; build early
- Email system depends on AWS SES setup and template engine
- CRM integrations depend on `MarketingProvider` interface (built into core)
- AI features are last priority — Phase 4 or later
