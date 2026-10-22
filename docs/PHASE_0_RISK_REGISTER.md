# NAMMA KARNATAKA
## Phase 0 Prioritised Risk Register

**Product:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Document ID:** NK-RISK-001  
**Version:** 1.0  
**Phase:** Phase 0 Baseline  
**Audience:** Product Manager, Lead Architect, Security Reviewer, DevOps  
**Date:** October 2026  

---

## 1. Risk Assessment Methodology

Risks are systematically evaluated using a qualitative 2-axis matrix: **Probability** (Low, Medium, High) and **Impact** (Low, Medium, High).

| Severity Level | Definition | Action Required |
|---|---|---|
| **CRITICAL** | High Probability + High Impact, or severe vulnerability/data-loss risk. | Mandatory mitigation and automated detection before Phase 1 completion. |
| **HIGH** | Medium-to-High Impact on core user journey, cost, or reliability. | Mitigation architected into MVP baseline; tested in Phase 3/4. |
| **MEDIUM** | Moderate operational or usability friction. | Standard defensive engineering and logging. |
| **LOW** | Minor edge cases or cosmetic issues. | Monitored and addressed if capacity allows. |

---

## 2. Comprehensive Risk Register

| Risk ID | Category | Description | Probability | Impact | Priority | Mitigation Strategy | Detection Method | Owner Role | Escalation Trigger |
|---|---|---|---|---|---|---|---|---|---|
| **RSK-AI-01** | AI | **Hallucination of Fictional Destinations:** LLM generates non-existent attractions or places outside Karnataka. | High | High | **CRITICAL** | Strict grounding: Prompt only contains candidate catalog IDs; Pydantic validator rejects any response containing unregistered destination IDs. | Automated unit test checking validator rejection of unlisted IDs. | AI Systems Eng | Any ungrounded ID reaching frontend. |
| **RSK-SEC-01** | Security | **Cross-User Itinerary Exposure:** User A accesses User B's saved trip due to missing/misconfigured RLS policies. | Low | High | **HIGH** | Enable PostgreSQL Row Level Security (`auth.uid() = user_id`) on `trips` and `itinerary_snapshots`; backend double-checks ownership. | Automated multi-tenant pytest tests using alternating Supabase JWTs. | Lead Architect | Any HTTP 200 on unauthorized trip UUID request. |
| **RSK-SEC-02** | Security | **Client-Side Secret Leak:** Backend API keys (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) inadvertently bundled into frontend. | Medium | High | **CRITICAL** | Strict naming convention (only `VITE_` variables accessible to client); build-time CI scanner greps for sensitive key patterns in `dist/`. | CI script grep scan in PR workflow. | DevOps / Sec | CI detects secret pattern or alert from secret scanner. |
| **RSK-AI-02** | AI / Reliability | **Primary AI Outage or Rate Limit Spikes:** Groq or Gemini API encounters 429 rate limit, 503 outage, or network partition. | High | High | **CRITICAL** | Dual-provider adapter architecture with primary-then-secondary fallback, bounded timeouts (12s/15s), and deterministic rule-based fallback. | Prometheus/Sentry alert on provider failure count; unit tests with mocked failures. | Backend Lead | Primary provider outage lasting > 5 minutes. |
| **RSK-DATA-01** | Data Quality | **Deceptive Zero Costs:** Missing entry fees, parking fees, or activity costs are silently calculated as ₹0. | Medium | High | **HIGH** | Explicit state distinction: Unknown values are stored as `null` with `status = "unknown"`; budget engine excludes them from minimum totals and displays warning badges. | Automated budget unit tests verifying `null` cost handling. | Database Arch | Any zero-cost calculation for unverified entries. |
| **RSK-LANG-01** | Localization | **Kannada Language Degradation on Error:** System reverts to English when an external AI call or translation fails. | Medium | Medium | **HIGH** | Locale is stored in client state/localStorage and isolated from API response payloads; error messages are fetched from pre-compiled static Kannada JSON catalogs. | Playwright E2E test simulating network drop while locale is set to `kn`. | Frontend Lead | User-reported language reset after error. |
| **RSK-MAP-01** | Maps / Uncertainty | **Misleading Straight-Line Routes:** The application displays straight-line distance between stops and travelers assume it is road mileage. | High | Medium | **HIGH** | UI explicitly labels straight-line metrics as *"Straight-line estimate (~X km). Road time will be longer."* and never draws straight lines as roads without OSRM route data. | UI design review and visual regression tests. | Product Manager | User complaints regarding unrealistic travel times. |
| **RSK-DATA-02** | Data Quality | **Stale or Inaccurate Offbeat Access Info:** Remote waterfall or viewpoint is closed due to monsoon/forest department order, but app recommends it as open. | High | High | **HIGH** | Editorial governance: Offbeat items carry mandatory caveats; `access_status` enum tracks `open_reported`, `seasonal`, `restricted`; `checked_at` timestamps exposed to user. | Content review workflow and user feedback mechanism. | Content Lead | Forest department or district travel advisory issued. |
| **RSK-AI-03** | AI / Cost | **Token/Cost Runaway from Parallel Inference:** Calling both Groq and Gemini in parallel on every user query doubles operational inference costs. | High | Medium | **HIGH** | Default to `primary_then_fallback` execution mode. Gemini is called ONLY when Groq fails, timeouts, or returns malformed JSON. | Daily API spend monitoring and log tracking of provider dispatch ratios. | Lead Architect | Daily inference cost exceeds allocated budget threshold ($5/day in beta). |
| **RSK-SEC-03** | Security | **LLM Prompt Injection via Trip Inputs:** Malicious user inputs prompt overrides in custom interest fields. | Medium | Medium | **MEDIUM** | Strict sanitization: input length limited to 100 characters; alphanumeric filtering; user inputs injected strictly as quoted JSON values in data payload, never raw system prompts. | Automated prompt-injection test fixtures in test suite. | Security Lead | Unexpected system prompt leak in model output. |
| **RSK-OPS-01** | Operations | **Map Tile Usage Rate Limiting:** Exceeding free OpenStreetMap tile usage limits during high traffic. | Medium | Low | **MEDIUM** | Configure cached tile proxy or use commercial-grade free tier (e.g., CartoDB / MapLibre / Stadia) with proper attribution and caching headers. | Monitoring 429 responses on tile loading. | DevOps | Tile loading failure rate > 1%. |
| **RSK-DEV-01** | Delivery / Scope | **Scope Creep into Live Bookings and Complex OTA Features:** Attempting to build ticket booking, hotel availability, or payment gateways prematurely. | Medium | High | **HIGH** | Strict scope enforcement: PRD Section 2.2 and Architecture Decision Matrix classify all live bookings as `OUT_OF_SCOPE`. | Phase gate reviews before starting subsequent phases. | Product Manager | Pull Request introducing third-party booking APIs. |
| **RSK-DATA-03** | Legal / IP | **Unlicensed Destination Imagery:** Using copyright-protected images scraped from commercial travel blogs. | Medium | High | **HIGH** | Use strictly Wikimedia Commons (CC-BY / CC-BY-SA) or official Karnataka Tourism open-access assets, storing license URL and attribution in `destination_sources`. | Content audit checklist before publishing seed data. | Content Lead | Copyright infringement takedown notice. |
| **RSK-UX-01** | Accessibility | **Map-Only Trip Representation:** Visually impaired users or screen-reader users unable to interpret the itinerary because stops are only on a canvas map. | Low | Medium | **MEDIUM** | Provide an accessible, semantic HTML list/timeline alongside or below the map as a first-class view. | Axe-core accessibility scanner in CI; keyboard navigation testing. | Frontend Lead | Accessibility score drops below 90 on Lighthouse. |

---

## 3. Risk Governance and Review Cadence

1. **Phase Gate Review:** At the conclusion of every implementation phase (Phase 1 through Phase 5), the Lead Architect and Product Manager must review the active status of all High and Critical risks.
2. **Weekly Operational Triage:** Monitor provider failover rates, fallback planner invocation frequency, and API latency percentiles (p50, p95, p99).
3. **Emergency Escalation Protocol:** If any `CRITICAL` risk trigger occurs (e.g. cross-user data leakage or secret exposure), all deployments are immediately halted, the affected API keys are revoked/rotated, and a post-mortem is documented.
