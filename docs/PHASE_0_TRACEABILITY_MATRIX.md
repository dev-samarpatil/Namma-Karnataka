# NAMMA KARNATAKA
## Phase 0 Requirements Traceability Matrix

**Product:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Document ID:** NK-RTM-001  
**Version:** 1.0  
**Phase:** Phase 0 Baseline  
**Audience:** Technical Lead, QA Engineers, Product Manager  
**Date:** October 2026  

---

## 1. Traceability Overview

This matrix links all functional requirements (FR), non-functional requirements (NFR), data governance rules (DATA), security policies (SEC), and AI requirements (AI) from the PRD, TRD, and Backend Schema documents directly to:
1. Architectural components.
2. Verified MVP Acceptance Criteria (`AC-...`).
3. Planned test types.
4. Target implementation phases.

---

## 2. Requirements Traceability Table

| Req ID | Requirement Description | Source Doc | Priority | MVP Classification | Dependent Components | Security / Data Implications | AC ID | Planned Test Type | Implementation Phase | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **FR-L10** | Language selection (English or Kannada) | PRD 9.1 | P0 | `MVP_REQUIRED` | Frontend Navbar, Language Context | Persisted in localStorage | `AC-LANG-001` | E2E (Playwright) | Phase 1 | `LOCKED` |
| **FR-L11** | Persistent language preference across views | PRD 9.1 | P0 | `MVP_REQUIRED` | Frontend State, i18n Context | No sensitive data | `AC-LANG-001` | E2E (Playwright) | Phase 1 | `LOCKED` |
| **FR-L12** | API language propagation (`Accept-Language`) | PRD 9.1 | P0 | `MVP_REQUIRED` | Frontend API client, FastAPI middleware | Validated header | `AC-LANG-003` | API Integration | Phase 1 | `LOCKED` |
| **FR-L13** | Static UI localization without hardcoded strings | PRD 9.1 | P0 | `MVP_REQUIRED` | `react-i18next`, `locales/en`, `locales/kn` | Zero hardcoded client strings | `AC-LANG-001` | Unit (Vitest) | Phase 1 | `LOCKED` |
| **FR-L14** | Generated itinerary content in selected language | PRD 9.1 | P0 | `MVP_REQUIRED` | AI Prompts, Groq/Gemini adapters | Machine fields remain ASCII | `AC-LANG-003` | Integration (Mocked AI) | Phase 3 | `LOCKED` |
| **FR-L18** | Language preserved upon external error | PRD 9.1 | P0 | `MVP_REQUIRED` | Frontend Error Boundaries, i18n | Prevents unwanted English fallback | `AC-LANG-002` | E2E Mocked Error | Phase 3 | `LOCKED` |
| **FR-TR20** | User provides trip origin location | PRD 9.2 | P0 | `MVP_REQUIRED` | Planner Form, Pydantic Schema | Input sanitized (max 100 char) | `AC-FORM-001` | Unit / Form Test | Phase 2 | `LOCKED` |
| **FR-TR21** | Trip duration (1–7 days) validated | PRD 9.2 | P0 | `MVP_REQUIRED` | Form component, FastAPI validator | Rejects 0 or >7 days | `AC-FORM-001` | Unit / Schema Test | Phase 2 | `LOCKED` |
| **FR-TR22** | Positive traveler count validated | PRD 9.2 | P0 | `MVP_REQUIRED` | Form component, FastAPI validator | Bounded integers $\ge 1$ | `AC-FORM-001` | Unit / Schema Test | Phase 2 | `LOCKED` |
| **FR-TR23** | Budget range and basis selection | PRD 9.2 | P0 | `MVP_REQUIRED` | Form component, Budget engine | Stored as minor currency units | `AC-BUD-001` | Unit / Schema Test | Phase 2 | `LOCKED` |
| **FR-TR24** | Supported travel interests selection | PRD 9.2 | P0 | `MVP_REQUIRED` | Form component, Category filter | Checked against controlled enum | `AC-FORM-001` | Unit / Schema Test | Phase 2 | `LOCKED` |
| **FR-TR25** | Transport mode preference selection | PRD 9.2 | P0 | `MVP_REQUIRED` | Form component, Route engine | Controlled transport enum | `AC-FORM-001` | Unit / Schema Test | Phase 2 | `LOCKED` |
| **FR-TR26** | Travel pace selection (relaxed/balanced/packed) | PRD 9.2 | P0 | `MVP_REQUIRED` | Form component, AI Prompt Builder | Controls daily stop limit | `AC-FORM-001` | Unit / Schema Test | Phase 2 | `LOCKED` |
| **FR-DE30** | Stable unique destination ID & slug | PRD 9.3 | P0 | `MVP_REQUIRED` | Database `destinations`, Pydantic | Non-sequential, unguessable | `AC-DISC-001` | Database Schema Test | Phase 2 | `LOCKED` |
| **FR-DE31** | Search destinations by name / alias | PRD 9.3 | P0 | `MVP_REQUIRED` | Destination Repo, API endpoint | Trigram/ilike parameterized query | `AC-DISC-001` | Integration (API) | Phase 2 | `LOCKED` |
| **FR-DE32** | Filter by category and district | PRD 9.3 | P0 | `MVP_REQUIRED` | Destination Repo, UI Explorer | Parameterized SQL filters | `AC-DISC-001` | Integration (API) | Phase 2 | `LOCKED` |
| **FR-DE33** | Destination detail with coordinates & source | PRD 9.3 | P0 | `MVP_REQUIRED` | Detail View, `destination_sources` | Public read-only access | `AC-DISC-002` | E2E (Playwright) | Phase 2 | `LOCKED` |
| **FR-DE34** | Record source and checked date | PRD 9.3 | P0 | `MVP_REQUIRED` | `destination_sources` table | Audit trail for factual claims | `AC-DISC-002` | Database Contract | Phase 2 | `LOCKED` |
| **FR-DE35** | Verification status distinction | PRD 9.3 | P0 | `MVP_REQUIRED` | Destination Schema, UI Badges | Shows verified/estimated/stale | `AC-DISC-002` | Component RTL Test | Phase 2 | `LOCKED` |
| **FR-DE36** | Exclude restricted/closed destinations | PRD 9.3 | P0 | `MVP_REQUIRED` | Destination Repository Query | Excluded from normal search | `AC-DISC-001` | Unit / Repository Test | Phase 2 | `LOCKED` |
| **FR-DE37** | Editorial offbeat classification with caveats | PRD 9.3 | P1 | `MVP_REQUIRED` | Catalog tag, UI Tooltip/Banner | Mandatory safety advisory | `AC-DISC-003` | Component RTL Test | Phase 2 | `LOCKED` |
| **FR-DE38** | Unknown prices/hours never shown as zero | PRD 9.3 | P0 | `MVP_REQUIRED` | Cost Schema, Budget Engine | Represented as null + unknown | `AC-BUD-002` | Unit / Schema Test | Phase 2 | `LOCKED` |
| **FR-IT40** | Structured multi-day itinerary response | PRD 9.4 | P0 | `MVP_REQUIRED` | Itinerary Service, Pydantic | Strict JSON schema contract | `AC-AI-001` | Integration (API) | Phase 3 | `LOCKED` |
| **FR-IT41** | All destination IDs must match curated catalog | PRD 9.4 | P0 | `MVP_REQUIRED` | Itinerary Validator Service | Anti-hallucination boundary | `AC-AI-001` | Unit (Validator) | Phase 3 | `LOCKED` |
| **FR-IT48** | Deterministic fallback itinerary on AI failure | PRD 9.4 | P0 | `MVP_REQUIRED` | Fallback Service, Destination Repo | Offline rule-based generation | `AC-DET-001` | Integration (Mocked Outage)| Phase 3 | `LOCKED` |
| **FR-IT49** | Honest recoverable error on insufficient data | PRD 9.4 | P0 | `MVP_REQUIRED` | Fallback Service, API Handler | Preserves user form state | `AC-DET-002` | Unit / Integration Test | Phase 3 | `LOCKED` |
| **FR-AI50** | Independent Groq and Gemini adapters | PRD 9.5 | P0 | `MVP_REQUIRED` | `app/adapters/groq`, `app/adapters/gemini`| Secrets remain server-side | `AC-AI-002` | Unit (Adapter Mocks) | Phase 3 | `LOCKED` |
| **FR-AI53** | Provider-specific timeouts (Groq 12s, Gem 15s) | PRD 9.5 | P0 | `MVP_REQUIRED` | `httpx.AsyncClient` timeouts | Prevents unbounded hung calls | `AC-AI-002` | Integration (Timeouts) | Phase 3 | `LOCKED` |
| **FR-AI55** | Strict Pydantic output schema validation | PRD 9.5 | P0 | `MVP_REQUIRED` | `ItineraryValidator` | Rejects malformed JSON | `AC-AI-003` | Unit (Malformed Fixtures) | Phase 3 | `LOCKED` |
| **FR-AI57** | Primary-then-secondary provider failover | PRD 9.5 | P0 | `MVP_REQUIRED` | AI Orchestrator Service | Failover within 28s budget | `AC-AI-002` | Integration (Failover) | Phase 3 | `LOCKED` |
| **FR-BR60** | Deterministic budget arithmetic in backend | PRD 9.6 | P0 | `MVP_REQUIRED` | `app/services/budget.py` | Discards LLM arithmetic | `AC-BUD-001` | Unit (50 Math Fixtures)| Phase 3 | `LOCKED` |
| **FR-BR62** | Explicit cost status badges | PRD 9.6 | P0 | `MVP_REQUIRED` | Budget Schema, UI Breakdown | Verified vs Estimated vs Unknown | `AC-BUD-002` | Component RTL Test | Phase 3 | `LOCKED` |
| **FR-BR63** | Per-person cost calculation | PRD 9.6 | P0 | `MVP_REQUIRED` | Budget Service, UI Summary | Exact integer/minor arithmetic | `AC-BUD-001` | Unit (Math Test) | Phase 3 | `LOCKED` |
| **FR-BR65** | Route distance retaining source/approx flag | PRD 9.6 | P0 | `MVP_REQUIRED` | Routing Service, OSRM Adapter | Distinguishes road vs straight | `AC-MAP-002` | Unit (Route Service) | Phase 3 | `LOCKED` |
| **FR-UI70** | Interactive Leaflet map with stop markers | PRD 9.7 | P0 | `MVP_REQUIRED` | `react-leaflet`, Map View | Accessible text fallback | `AC-MAP-001` | Component RTL Test | Phase 2 | `LOCKED` |
| **FR-UI71** | Visual stop sequencing on map | PRD 9.7 | P0 | `MVP_REQUIRED` | Leaflet Waypoints, Marker Icons | Clear day/stop numbered pins | `AC-MAP-001` | Visual / Component Test | Phase 2 | `LOCKED` |
| **FR-US80** | Anonymous guest itinerary planning | PRD 9.8 | P0 | `MVP_REQUIRED` | Public API endpoints, Client State | Zero forced login | `AC-AUTH-001` | E2E (Playwright) | Phase 3 | `LOCKED` |
| **FR-US81** | Authenticated saved trips via Supabase | PRD 9.8 | P1 | `MVP_REQUIRED` | Supabase Auth, `POST /api/v1/trips` | Cryptographically checked JWT | `AC-AUTH-002` | E2E (Playwright) | Phase 4 | `LOCKED` |
| **FR-US82** | Row Level Security ownership enforcement | PRD 9.8 | P0 | `MVP_REQUIRED` | Supabase RLS, `trips` table | User A cannot read User B trip | `AC-AUTH-003` | Integration (Multi-JWT) | Phase 4 | `LOCKED` |
| **SEC-001** | Zero server secrets in client bundle | TRD 16 | P0 | `MVP_REQUIRED` | Vite Build, CI Scanner | No service role / LLM keys in JS | `AC-SEC-001` | Automated CI Grep Scan | Phase 1 | `LOCKED` |
| **SEC-002** | Prompt injection sanitization | TRD 16 | P0 | `MVP_REQUIRED` | Prompt Builder Service | Strips control characters | `AC-SEC-002` | Security Unit Test | Phase 3 | `LOCKED` |
| **SEC-003** | Log redaction for authorization headers | TRD 16 | P0 | `MVP_REQUIRED` | Logging Filter Middleware | Redacts Bearer/Cookie headers | `AC-SEC-003` | Unit (Logger Test) | Phase 1 | `LOCKED` |
| **NFR-01** | Destination search p95 under 500 ms | TRD 17 | P0 | `MVP_REQUIRED` | PostgreSQL Indexes, FastAPI | Optimized indexed queries | `AC-PERF-001` | Load Test (Locust/k6) | Phase 2 | `LOCKED` |
| **NFR-02** | Global itinerary timeout under 28 seconds | TRD 17 | P0 | `MVP_REQUIRED` | AI Orchestrator Timeout Guard | Guaranteed client return < 28s | `AC-PERF-002` | Integration (Delay Mocks)| Phase 3 | `LOCKED` |
