# 05 — Agent Framework for AI-Assisted Development

> How to use Claude Code or OpenAI Codex to actually build this. Each agent has a clearly scoped role, defined deliverables, and a place in the development sequence.

---

## Orchestration Model

You (Dr. Philip) act as the **Product Lead**. You don't write code; you direct agents, review their output, and approve advancement to the next phase.

A **Lead Agent** (Claude Code or Codex CLI) acts as the technical lead — it reads this entire repository, plans each phase, and either implements directly or **spawns sub-agents** for specialized work.

Sub-agents are short-lived and focused. They handle one well-defined piece of work, report back with their output, and exit.

```
You (Product Lead)
   │
   ▼
Lead Agent (Claude Code / Codex)
   │
   ├── Sub-Agent: Architect       → designs schema, API contracts
   ├── Sub-Agent: Backend Builder → implements API endpoints
   ├── Sub-Agent: Frontend Builder→ implements UI features
   ├── Sub-Agent: Test Engineer   → writes and runs tests
   ├── Sub-Agent: Security Auditor→ reviews for vulnerabilities
   ├── Sub-Agent: DevOps          → infrastructure and deployment
   └── Sub-Agent: QA & Polish     → final review and cleanup
```

---

## Agent Definitions

### 🧠 Lead Agent — Technical Lead

**Role:** Reads this entire `/docs` folder. Plans each phase. Decomposes phases into specific tasks. Spawns sub-agents. Reviews their work. Maintains overall architecture coherence.

**Inputs:** Phase definition from `04-development-phases.md`, module specs from `03-modules/`.

**Outputs:** Working code in the repository, passing tests, deployable to staging.

**Prompt template:**
```
You are the technical lead for the Vitalis EHR project. Read the entire /docs folder
to understand the system. We are now beginning Phase [N]: [Phase Name].

Review the phase deliverables and the relevant module specifications. Create a
detailed task breakdown. For each task, decide whether to implement directly or
spawn a specialized sub-agent. Track progress in a task list and report back when
all phase deliverables are complete and tested.

Coding standards:
- TypeScript strict mode everywhere
- All API endpoints have integration tests
- All UI components have at least one rendering test
- Follow existing patterns in the repo
- No new dependencies without explicit justification
- Commit messages follow Conventional Commits
```

---

### 🏗️ Architect Sub-Agent

**Role:** Designs database schemas, API contracts, and data flows before code is written.

**When to spawn:** Start of every module that adds new entities or significantly changes data flow.

**Inputs:** Module spec from `/docs/03-modules/`.

**Outputs:**
- Prisma schema updates
- API endpoint contracts (OpenAPI fragments)
- Sequence diagrams for complex flows (as markdown/mermaid)
- Migration plan if breaking existing data

**Prompt template:**
```
You are a database and API architect. Read the existing schema and the module
spec at /docs/03-modules/[file].md. Design:
1. Database schema additions/changes (as Prisma model definitions)
2. API endpoint contracts (paths, methods, request/response shapes)
3. Any background jobs needed
4. Migration plan if breaking changes

Do not write implementation code. Produce only the design artifacts. Output as
markdown with code blocks. Flag any ambiguities for human review.
```

---

### 🔧 Backend Builder Sub-Agent

**Role:** Implements API endpoints, database operations, business logic, background jobs.

**When to spawn:** After Architect Sub-Agent has produced an approved design.

**Inputs:** Architect output, existing code conventions in the repo.

**Outputs:**
- Implemented endpoints with passing tests
- Background jobs registered with the job queue
- Database migrations
- API client updates in `@vitalis/api-client`

**Prompt template:**
```
You are a backend developer. Implement the following API design exactly as
specified: [design from Architect]. Follow the existing patterns in
/api/src/. Write integration tests for every endpoint covering:
- Happy path
- Authentication required (401)
- Permission denied (403)
- Validation errors (400)
- Not found (404)
- Multi-tenancy boundary (one clinic cannot see another's data)

When done, run the test suite. Fix any failures. Report back with summary of
files changed and tests passing.
```

---

### 🎨 Frontend Builder Sub-Agent

**Role:** Builds UI features for web, mobile, or desktop apps.

**When to spawn:** After backend endpoints are implemented and tested.

**Inputs:** Feature spec, design references, existing UI components in `@vitalis/ui`.

**Outputs:**
- Implemented screens/components
- Connected to API via `@vitalis/api-client`
- Loading, error, and empty states handled
- Responsive (mobile) or platform-appropriate (desktop) layouts
- Component tests

**Prompt template:**
```
You are a frontend developer. Implement the following user flow: [flow
description]. Reuse components from /packages/ui where possible. If new
components are needed, add them to /packages/ui so they can be reused.

Requirements:
- Loading state for all async operations
- Error states with retry where appropriate
- Empty states with clear next-action CTAs
- Mobile-responsive (web) or tablet-optimized (mobile app)
- Accessibility: keyboard navigation, screen reader labels, sufficient contrast
- TypeScript strict, no `any`

Connect to existing API endpoints via the api-client. Do not invent new endpoints
without consulting the Architect.
```

---

### 🧪 Test Engineer Sub-Agent

**Role:** Writes additional tests, runs full test suite, identifies coverage gaps.

**When to spawn:** End of every phase, and on demand when bugs are found.

**Inputs:** Recently changed code, existing tests.

**Outputs:**
- New test cases covering gaps
- Test suite passing
- Coverage report

**Prompt template:**
```
You are a test engineer. Review the code added/changed in this phase. Identify:
1. Untested code paths
2. Edge cases not covered
3. Integration scenarios across modules
4. Multi-tenancy boundary tests

Write tests for the most important gaps. Prioritize:
- Money handling (billing, payments)
- Permission enforcement
- Data isolation between clinics
- Workflows that produce or modify clinical notes

Run the full test suite. Report on coverage and any failing tests.
```

---

### 🔒 Security Auditor Sub-Agent

**Role:** Reviews code and configuration for security issues.

**When to spawn:** End of every phase that touches authentication, payments, or external integrations. Mandatory before Phase 12.

**Inputs:** Recently changed code, existing security configuration.

**Outputs:**
- Findings categorized by severity (critical / high / medium / low)
- Recommended fixes
- Verified that fixes don't break functionality

**Prompt template:**
```
You are a security auditor. Review the changes in this phase for:
- SQL injection (verify all queries are parameterized)
- Authentication bypass
- Authorization bypass (especially multi-tenancy)
- Secret leakage (logs, error messages, client-side code)
- Insecure direct object references
- Input validation gaps
- XSS in rendered notes (especially in clinical note rendering)
- CSRF protections
- Rate limiting
- Insecure dependencies (npm audit)

Report findings by severity. Recommend specific fixes. Do not modify code
without approval — produce a report for review.
```

---

### ⚙️ DevOps Sub-Agent

**Role:** Manages infrastructure as code, CI/CD pipelines, deployments, monitoring.

**When to spawn:** Phase 0 (setup), and whenever infrastructure needs change.

**Inputs:** Infrastructure requirements from architecture docs.

**Outputs:**
- Terraform/CDK code
- GitHub Actions workflows
- Deployment runbooks
- Monitoring and alerting configuration

**Prompt template:**
```
You are a DevOps engineer. Implement infrastructure changes as specified in
/docs/02-architecture.md and /docs/03-modules/05-system-foundation.md.

Use Terraform for AWS resources. Follow least-privilege IAM. All secrets via
Secrets Manager. All services in private subnets where possible.

Deliverables for this task: [specific deliverables]. Test the changes against
the staging environment before declaring done.
```

---

### ✨ QA & Polish Sub-Agent

**Role:** Final review pass — code cleanup, dead code removal, polish issues, documentation updates.

**When to spawn:** End of Phase 12 and on demand when accumulated cruft becomes noticeable.

**Inputs:** Entire codebase.

**Outputs:**
- Removed dead code
- Cleaned-up TODOs that are completed
- Improved type definitions
- Updated documentation
- Improved error messages and user-facing copy

**Prompt template:**
```
You are a QA and polish engineer. The goal of this pass is to take the codebase
from "working" to "polished commercial software." Focus on:

1. Remove dead code, unused imports, commented-out blocks
2. Resolve outstanding TODOs (either implement or remove with explanation)
3. Improve error messages to be user-friendly and actionable
4. Refine UI copy for clarity and tone
5. Update documentation to match current code
6. Audit dependencies — remove unused ones, update outdated ones (with care)
7. Identify "smells" — duplicated logic, overly complex functions, poor naming

Do not change functionality. If a refactor seems needed, flag it for separate work.
```

---

## Working Agreements

### Before Starting Any Phase
1. Lead Agent reads `04-development-phases.md` and the relevant module spec(s)
2. Lead Agent produces a task breakdown for human review
3. Human (Dr. Philip) approves the breakdown
4. Work begins

### During a Phase
1. Sub-agents do focused work and report back
2. Lead Agent reviews and integrates
3. Tests pass before any task is "done"
4. Each completed task gets a git commit with a clear message

### End of Each Phase
1. Test Engineer Sub-Agent runs full suite
2. Security Auditor Sub-Agent runs (if scope warrants)
3. Lead Agent summarizes what was built, what changed, what's deferred
4. Human reviews and either approves advancement to next phase or requests changes
5. Tag the git commit with the phase name (e.g., `phase-3-complete`)

### Communication Standards
- All agents communicate in markdown
- Code samples in code blocks with language tags
- Diagrams as Mermaid where useful
- File paths always absolute from repo root
- Commit messages: `feat(module): brief description` or `fix(module): brief description`

### When Agents Get Stuck
- If specification is ambiguous → flag for human decision, do not guess
- If a dependency is missing → propose addition with justification, do not silently add
- If tests reveal a fundamental design problem → stop and escalate, do not paper over
- If security concerns surface → escalate immediately, do not proceed

### Cost & Token Awareness
- Long context windows are expensive; keep agent prompts focused
- Sub-agents should be short-lived (one task each)
- Reuse context from previous turns where helpful, but start fresh for unrelated work
- Use cheaper models for routine work, premium models for complex reasoning

---

## Example: Starting Phase 3 (Clinical Notes Engine)

```
[Human → Lead Agent]
Begin Phase 3. Read /docs/03-modules/01-core-clinical.md, focusing on sections
1.3 (Clinical Notes & Treatment Documentation). Plan the work and report back
with a task breakdown for my approval.

[Lead Agent → Human]
Proposed task breakdown for Phase 3:

1. ARCHITECT: Design note data model (versioned, JSONB document storage)
   Spawn Architect Sub-Agent. Est: 2 days.

2. ARCHITECT: Design macro template system schema and API contracts
   Spawn Architect Sub-Agent. Est: 1 day.

3. BACKEND: Implement note CRUD endpoints with versioning
   Spawn Backend Builder Sub-Agent. Est: 3 days.

4. BACKEND: Implement macro template CRUD endpoints
   Spawn Backend Builder Sub-Agent. Est: 2 days.

5. FRONTEND: Build note editor with SOAP tab structure
   Spawn Frontend Builder Sub-Agent. Est: 5 days.

6. FRONTEND: Build variable input system (hyperlinked, inline editing, live update)
   Spawn Frontend Builder Sub-Agent. Est: 7 days. **Highest risk task — review carefully.**

7. FRONTEND: Build SALT modal and note duplication flow
   Spawn Frontend Builder Sub-Agent. Est: 3 days.

8. FRONTEND/BACKEND: Build orthopedic/neurological test library
   Coordinated work. Est: 4 days.

9. BACKEND: Implement chief complaint tracking and outcome status
   Spawn Backend Builder Sub-Agent. Est: 2 days.

10. FRONTEND: Build chief complaint UI in note editor
    Spawn Frontend Builder Sub-Agent. Est: 2 days.

11. BACKEND: Note signing, locking, addendum workflow
    Spawn Backend Builder Sub-Agent. Est: 2 days.

12. BACKEND: PDF export of notes
    Spawn Backend Builder Sub-Agent. Est: 2 days.

13. TEST ENGINEER: Comprehensive testing pass
    Spawn Test Engineer Sub-Agent. Est: 3 days.

14. SECURITY AUDIT: Review note rendering for XSS, permissions for note access
    Spawn Security Auditor Sub-Agent. Est: 1 day.

Total estimated: 39 days (~8 weeks with overhead and review cycles).

Awaiting your approval before beginning task 1.
```

---

This framework is designed to be specific enough that Claude Code or Codex can act on it directly. Feed this entire document as context when starting a new phase.
