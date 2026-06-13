# Module 04 — Reporting & Analytics

> Dashboards for daily situational awareness, outcome tracking for clinical efficacy, and customizable reports for business decisions.

---

## 4.1 Primary Dashboard

### At-a-Glance Today View
- Appointments scheduled today
- New patients today
- Reactivations today (patients not seen in 12+ months returning)
- Revenue collected today
- Outstanding messages
- Pending appointment requests

### Week-by-Week Schedule Health
- Total patient visits scheduled per upcoming week
- New patient visits per week
- Species breakdown per week (canine / equine / feline / other)
- Visual trend graph (last 4 weeks + next 4 weeks)
- Quick-spot scheduling gaps and opportunities

### Date Range Selector
- All dashboard metrics support a custom date range
- Preset ranges: today, yesterday, this week, last week, this month, last month, this quarter, this year, custom
- Comparison view: this period vs. last period (% change)

---

## 4.2 Appointment Reports

- Total appointments by date range
- Appointments by type (initial eval, routine adjustment, laser, reexam, etc.)
- Appointments by provider
- Appointments by species
- Appointments by status (completed, cancelled, no-show)
- No-show rate by provider, by client, by time of day, by day of week
- Cancellation patterns
- Average appointment duration vs. scheduled duration

---

## 4.3 Revenue Reports

### Top-Line Metrics
- Total revenue (date range)
- Average revenue per visit (ARPV)
- Revenue per provider
- Revenue per species
- Revenue per service type (adjustments vs. laser vs. PEMF, etc.)
- Revenue per client (top clients)
- Lifetime value (LTV) per client

### Trends
- Revenue trend chart (daily, weekly, monthly)
- Year-over-year comparison
- Growth rate

### Provider Performance
- Revenue per provider (date range)
- Patients per provider
- Visits per provider
- Outcome rate per provider (resolution success rate)
- Species mix per provider
- Average revenue per visit per provider

### Client Reports
- Top revenue clients
- Clients by visit count
- Clients with active packages
- Clients with credits
- Inactive clients (no visits in X months)

---

## 4.4 Patient Outcome Tracking

### Data Sources
- Chief complaint captured at intake / initial exam
- Status update on every subsequent treatment note (resolved / improved / unchanged / declined / worsened)
- Severity scale tracked over time

### Outcome Reports
- Overall resolution rate (% of cases with resolved chief complaints)
- Resolution rate by condition type
- Resolution rate by species
- Resolution rate by provider
- Average visits to resolution per condition
- Cases ongoing / cases referred out

### Efficacy by Condition
- For each chief complaint type, show:
  - Total cases seen
  - Cases resolved
  - Cases ongoing
  - Cases referred out
  - Average visits to resolution
  - Success rate (resolved + improved)

### Outcome Trends
- Resolution rate trend over time (are we getting better?)
- Comparison across providers (anonymized or named based on permission)

### Marketing-Ready Statistics
- Export-friendly outcome stats for use in marketing materials
- "Of XX cases of [condition] treated, we achieved resolution in XX%"
- Disclaimers and methodology automatically attached

---

## 4.5 Financial Reports

- Accounts receivable aging (current, 30, 60, 90+ days)
- Past due invoices and total amount outstanding
- Collection rate (collected / billed)
- Refunds issued
- Credits outstanding
- Package liability (paid-but-unused service value)
- Payment method breakdown (% credit card vs. cash vs. check vs. other)
- Tax collected by period

---

## 4.6 Customizable Reporting

### Report Builder
- Visual drag-and-drop report creator
- Pick data source (appointments, revenue, patients, outcomes, etc.)
- Pick metrics, dimensions, filters
- Choose visualization (table, line, bar, pie)
- Save report for re-use
- Schedule reports (email me this report every Monday at 9am)

### Standard Sortable / Filterable Fields
- Date range
- Provider
- Species
- Breed
- Condition
- Outcome status
- Appointment type
- Service type
- Client (or client tag)
- Geographic area (for mobile practices)
- Custom tags

### Export
- CSV
- PDF
- Direct email
- Save to S3 / cloud drive

---

## 4.7 Audit Logging

### Logged Events
- All login attempts (successful and failed)
- User account changes
- Patient record changes (create, edit, delete, void)
- Note signing and addendums
- Financial transactions (payments, refunds, credits)
- Permission changes
- Settings changes
- Data exports
- API key usage

### Audit Log Viewer
- Available to admin role
- Filter by user, date range, event type
- Export for compliance
- Tamper-evident (cryptographic chain optional)

---

## Module Dependencies

- Most reports depend on data accumulated in Core Clinical (appointments, notes, billing)
- Outcome tracking depends on chief complaint capture + visit-to-visit status updates
- Build dashboards iteratively as data accumulates
