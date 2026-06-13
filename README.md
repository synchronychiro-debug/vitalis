# Vitalis EHR — Animal Chiropractic Practice Management System

> Comprehensive practice management and EHR platform purpose-built for animal chiropractors, with multi-species support (canine, equine, exotic), integrated billing, communication, CRM connectivity, and AI-assisted scheduling.

---

## Project Vision

Vitalis EHR is being built first for Dr. Philip Rodger's use at Synchrony Chiropractic, then commercialized for the broader animal chiropractic market. By focusing exclusively on animal patients, the system avoids HIPAA constraints while delivering enterprise-grade functionality at a price point accessible to mobile practitioners and brick-and-mortar clinics alike.

**Core differentiators:**
- Built for animals first, not retrofitted from human EHRs
- Hyperlinked variable inputs in clinical notes (industry-first UX)
- True multi-pet, client-level billing with shared credits and packages
- Pluggable payment processor architecture (no vendor lock-in)
- Open CRM integration framework (works with what practices already use)
- Offline-first mobile design for field practitioners

---

## Repository Structure

```
vitalis-ehr/
├── README.md                          # This file
├── docs/
│   ├── 01-vision.md                   # Product vision & target users
│   ├── 02-architecture.md             # Tech stack & system architecture
│   ├── 03-modules/
│   │   ├── 01-core-clinical.md        # Patient mgmt, scheduling, notes, billing, payments
│   │   ├── 02-portals-access.md       # Provider, client, admin portals + RBAC
│   │   ├── 03-communication.md        # Messaging, email, CRM, video, AI
│   │   ├── 04-reporting-analytics.md  # Dashboards, outcomes, custom reports
│   │   └── 05-system-foundation.md    # DB, mobile, desktop, cloud, API
│   ├── 04-development-phases.md       # Phased build plan (MVP → v1.0)
│   ├── 05-agent-framework.md          # Claude Code / Codex agent definitions
│   └── 06-strategic-considerations.md # Honest trade-offs & recommendations
└── /src                               # Code lives here once development begins
```

---

## How to Use This Repository

1. **Read in order:** Start with `01-vision.md`, then `02-architecture.md`, then the modules in `03-modules/`.
2. **For AI-assisted development:** Feed `05-agent-framework.md` to Claude Code or OpenAI Codex as the orchestration spec. Each agent has clear scope and deliverables.
3. **Follow the phases:** `04-development-phases.md` defines what gets built in what order. Do not skip ahead — later phases depend on earlier foundations.
4. **Review the trade-offs:** `06-strategic-considerations.md` flags decisions that affect cost, timeline, and commercial viability. Read this before locking in tech choices.

---

## Current Status

- ✅ Discovery & requirements gathering complete
- ✅ Module specifications documented
- ⬜ Architecture decisions finalized (pending review of strategic considerations)
- ⬜ Phase 1 development started
- ⬜ MVP feature complete
- ⬜ Beta testing with Synchrony Chiropractic
- ⬜ Commercial launch

---

## Owner

**Dr. Philip Rodger**
Synchrony Chiropractic | Ocala, FL
