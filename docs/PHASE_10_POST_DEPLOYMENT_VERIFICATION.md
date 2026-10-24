# Phase 10 — Post-Deployment Verification and Smoke Test Runbook

## 1. Overview and Verification Objectives

This document outlines the mandatory post-deployment verification procedures and automated smoke tests to be executed immediately after releasing **Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)** into any target environment (Staging or Production).

---

## 2. Post-Deployment Verification Checklist

| Step | Target Service | Validation Command / Action | Expected Result | Pass/Fail |
|------|----------------|-----------------------------|-----------------|-----------|
| **PV-01** | Frontend Root | `curl -I https://<host>/` | HTTP 200 OK, `content-type: text/html` | [ ] |
| **PV-02** | Static Assets | `curl -I https://<host>/assets/index-*.js` | HTTP 200 OK, `cache-control: immutable` | [ ] |
| **PV-03** | PWA Manifest | `curl https://<host>/manifest.webmanifest` | Valid JSON with `name: "Namma Karnataka"` | [ ] |
| **PV-04** | Service Worker | `curl https://<host>/sw.js` | HTTP 200 OK, `cache-control: no-cache` | [ ] |
| **PV-05** | Backend Health | `curl https://<api-host>/health` | HTTP 200 `{"status": "healthy"}` | [ ] |
| **PV-06** | Backend Readiness | `curl https://<api-host>/ready` | HTTP 200 `{"ready": true}` | [ ] |
| **PV-07** | Destination API | `curl https://<api-host>/api/v1/destinations?limit=5` | HTTP 200 with 5 verified destinations | [ ] |
| **PV-08** | Visual Discovery | `curl https://<api-host>/api/v1/visual-discovery/health` | HTTP 200 `{"status": "available"}` | [ ] |
| **PV-09** | Cloud Trips Auth | `curl -H "Authorization: Bearer <test-token>" https://<api-host>/api/v1/trips` | HTTP 200 with user's trip list | [ ] |
| **PV-10** | Tenant Isolation | Attempt accessing User 1 trip with User 2 token | HTTP 404 / 403 Forbidden | [ ] |

---

## 3. Core User Journey Smoke Tests

### 3.1 Unauthenticated Guest Journey
1. Open application in a clean private browser window.
2. Confirm language toggle switches between English and Kannada instantly.
3. Select 3-day itinerary from Bengaluru with "Balanced" pace.
4. Click "Generate Itinerary" → Verify daily schedule and budget display in < 5 seconds.
5. Click "Save Trip" → Verify trip saved to local storage.
6. Refresh the page → Verify saved trip persists in "Saved Trips" tab.

### 3.2 Authenticated Account & Migration Journey
1. Click "Connect Account" / "Sign In".
2. Sign in with test account.
3. Verify guest trip transfer prompt appears.
4. Transfer local trip to cloud → Confirm trip appears in Cloud Trips tab.
5. Sign out → Confirm cloud trips cache is wiped immediately to prevent data leakage.

---

## 4. Test Data Cleanup Policy

1. All automated post-deployment smoke tests must use deterministic test identifiers with prefix `smoke-test-*`.
2. Temporary smoke trips created during testing must be deleted at the conclusion of the smoke run using `DELETE /api/v1/trips/{id}`.
3. Never use or modify production user data during verification.
