# 06 — Strategic Considerations & Honest Trade-offs

> Direct, unvarnished thinking on the decisions that affect cost, timeline, and commercial viability. Read this before locking in tech choices. Not validation — assessment.

---

## What You've Designed Well

A few things are genuinely smart about this spec, and they're worth protecting against scope creep or simplification later:

**1. Hyperlinked variable inputs in clinical notes.** This is a real UX innovation in the animal chiropractic space. Industry-standard EHRs treat notes as text. Yours treats them as living documents. If this works as designed, it's a moat. Do not let agents quietly downgrade this to "form fields below the text."

**2. Client-level billing with shared credits and packages.** This matches how multi-pet households actually work. Most vet EHRs bill per-patient and force admins to manually move credits around. Real differentiator.

**3. Animals-only positioning.** Sidestepping HIPAA is a strategic gift. Protect it — do not let scope creep pull you into human practitioners "just to expand the market." That's where the regulatory cost lives.

**4. Pluggable payment processors.** Not locking practices into Stripe or Square is unusual and valuable. The architecture choice (interface + adapters) is correct.

---

## Where I'd Push Back

### 1. "Build a Zoom alternative" is its own product

You mentioned building a two-way video chat as an alternative to Zoom integration. **Don't do this.** A reliable, scalable, low-latency video product is a multi-million-dollar engineering project. WebRTC sounds simple in documentation and is brutal in production (NAT traversal, codec negotiation, TURN servers, dropped calls, etc.).

**Recommendation:** Integrate Zoom, Google Meet, and Microsoft Teams. Each takes 1–2 weeks. Skip the build-it-yourself path entirely, or defer to Phase 15+ if it ever truly matters.

### 2. "Custom integration framework for boutique local processors" is a PCI compliance landmine

The intent is good — give clinics flexibility. The reality is that anyone integrating a "boutique local processor" is going to want help configuring it, and the moment you're involved in moving payment card data through anything other than a Level 1 PCI-compliant processor (Stripe, Square, Adyen, etc.), you inherit liability you do not want.

**Recommendation:** Limit the official "pluggable processor" framework to PCI Level 1 providers. Maintain a short approved list (Stripe, Square, Adyen, Authorize.net, maybe Helcim or Clover). If a clinic wants something exotic, they can use Stripe with a custom acquirer through Stripe Connect — Stripe handles compliance, you don't. Frame the "pluggable" capability as "choose your processor from our supported list," not "bring your own anything."

### 3. Native iOS + Android + Windows + Mac is four products

You said you want all platforms. Reasonable. But "fully native on each" is a multi-million-dollar effort. The architecture doc recommends React Native + Tauri specifically because it gets you 70–85% code reuse without sacrificing the native feel users expect.

**Recommendation:** Commit to React Native + Tauri. Do not let any agent or engineer "convince you" that pure-native is better for any one platform. The 15–30% code uniqueness goes into the parts that matter (camera access, payment terminals, push notifications), not the parts users see.

### 4. AI "constantly monitoring" the system is expensive and vague

The AI assistance scope is the fuzziest part of the spec. "Continuous monitoring" with LLMs translates to real money — OpenAI/Anthropic API costs scale linearly with usage, and "monitoring everything" is a recipe for $5,000/month surprise bills.

**Recommendation:** Defer all AI features to Phase 11. Once you're in Phase 11, scope each AI feature individually with clear cost models. Examples:
- "Suggest patients to fill schedule gaps" → cheap, runs nightly, uses cached patient summaries
- "Real-time clinical decision support" → expensive, defer indefinitely
- "Voice-to-text dictation" → use Whisper API, cost is per audio minute, predictable

Also: AI suggestions should always be **advisory**, never automatic. The system never sends emails on its own based on AI inference.

### 5. The 12-month commercial timeline assumes more than solo AI-assisted dev

The phased plan estimates 52 weeks to commercial-ready. That assumes ~1–2 FTE of focused effort. Realistic for a small team. Aggressive for solo AI-assisted work where you are also running a chiropractic practice.

**Recommendation:**
- Internal Synchrony use by month 7 — realistic
- Commercial-ready by month 12 — optimistic
- Commercial-ready by month 18–24 — more honest expectation for solo work

This isn't a reason to slow down or change strategy. It's a reason to set expectations correctly with yourself so you don't burn out at month 10 when you're still six months from launch. Build it for yourself first. Use it. Stabilize it. *Then* sell it.

### 6. "Custom roles" sounds good and adds significant complexity

You mentioned admins should be able to create custom roles. This is a real feature, but custom RBAC systems are notoriously bug-prone. Until you have actual customers asking for it, ship with the five default roles in the spec and call it done.

**Recommendation:** Ship Phase 2 with hardcoded role definitions. Build the custom-role builder in Phase 12 only if real demand emerges. Most practices will fit cleanly into Admin / Provider / Front Desk / Client.

### 7. Offline-first is harder than it looks

Offline support is a correct requirement for mobile field practitioners. It's also one of the hardest things to build well. Sync conflicts, especially in clinical notes (two devices editing the same note offline), are subtle and dangerous.

**Recommendation:** Build offline mode as **read-mostly** first. Provider can view patient records, notes, and schedule offline. Writes (new notes, payments) are queued and uploaded when online, but the system clearly indicates "this hasn't synced yet" until it does. Full bidirectional sync with conflict resolution is a Phase 8+ enhancement, not MVP.

---

## What I'd Add That Isn't in the Spec

### Data Migration Tooling
Most practices considering switching EHRs are stuck on what they have. The single biggest sales blocker is "we'd have to re-enter everything." If you build importers for the top 3 competitor EHRs in animal chiro space, you can win deals other tools can't.

**Recommendation:** Add Phase 13 — "Migration Tooling." Research the export formats of competing tools (probably CSV or proprietary). Build a guided import flow.

### Multi-Clinic / Practice Group Support
Some growing practices have multiple locations. The architecture supports `clinic_id` scoping, but the UI doesn't address "switch between clinics" or "view consolidated reports across all my clinics."

**Recommendation:** Bake the multi-clinic capability into Phase 2 (Admin Dashboard). Even if you don't market to multi-location practices initially, having the capability makes the system future-proof and easier to sell up-market later.

### Referring Veterinarian Portal
You mentioned communicating with referring vets. A dedicated lightweight portal for them (view referred patient progress, receive notes, request consultations) would be a strong differentiator and accelerates referral relationships.

**Recommendation:** Consider adding to Phase 10 (Communications) — minimum viable referring-vet portal.

### Consent Forms & Digital Signatures
You'll need consent forms (treatment consent, telehealth consent, photo release, etc.). E-signature is standard expectation.

**Recommendation:** Add to Phase 5 (Client Portal). Use a built-in basic e-signature (sufficient for non-HIPAA animal work) or integrate DocuSign / Dropbox Sign if you want premium polish.

---

## Pricing Strategy (Brief)

You've designed a system that competes with full-featured veterinary EHRs (which charge $300–$800/month per practice) but in a niche where most practitioners use much cheaper tools (Acuity for scheduling, QuickBooks for billing, spreadsheets for notes) at $50–$150/month combined.

**Recommendation:**
- **Solo Practitioner tier:** $99/month flat — one provider, unlimited patients, all core features. Captures the mobile-only chiropractor like Synchrony was at founding.
- **Small Practice tier:** $199/month base + $49/provider over 2 — multiple providers, full reporting, integrations.
- **Growth tier:** $399/month base + $39/provider over 4 — adds AI features, custom roles, multi-location, white-label client portal.
- **Setup/migration fee:** $499 (waived for early customers in your network).

This pricing fits the chiropractor wallet, beats the cost of stitching together separate tools, and undercuts veterinary EHRs that don't really serve chiropractors anyway.

---

## Risks to Monitor

**Technical:**
- Clinical note variable system complexity → could swallow Phase 3 timeline
- Offline sync reliability → if it fails in real field conditions, providers lose trust fast
- Payment processor integration edge cases → refunds, disputes, partial captures are where bugs live

**Commercial:**
- Network effects favor incumbents → you'll need clear differentiation and migration tooling
- Animal chiro is a small TAM (Total Addressable Market) → think about adjacent expansions (rehab vets, integrative vets, animal acupuncturists)
- Word-of-mouth is critical in this small community → make Synchrony's success story sellable

**Operational:**
- You are the product visionary AND the primary beta tester AND the eventual sales lead AND running a chiropractic practice. That's a lot. → plan for cofounder or first hire when you cross 10 paying customers

---

## My Honest Bottom Line

This is a solid, well-thought-out product spec. The differentiators are real. The animal-only positioning is strategic gold. The architecture decisions are defensible.

The biggest risk is **scope** — too many features for one person to validate before commercial sale. Cut hard. Get the core (notes + scheduling + billing + client portal) right for Synchrony, ship to 3–5 friendly clinics, fix what they break, then add features based on real demand instead of upfront speculation.

Don't fall in love with the spec. Fall in love with the problem it solves.
