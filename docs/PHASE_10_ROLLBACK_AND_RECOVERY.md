# Phase 10 — Rollback and Disaster Recovery Procedures

## 1. Overview and Objectives

This document establishes the verified operational runbook for rolling back deployments, recovering from service disruptions, and invalidating cached client assets for **Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)**.

- **Recovery Point Objective (RPO):** < 15 minutes (database point-in-time recovery via Supabase daily backups and WAL logs).
- **Recovery Time Objective (RTO):** < 5 minutes (automated CDN instant rollback; < 10 minutes for backend container redeploy).

---

## 2. Frontend Rollback Procedures

### 2.1 CDN / Edge Hosting Rollback (Vercel, Cloudflare, Netlify)
If a critical frontend regression occurs post-deployment:
1. Open hosting deployment dashboard.
2. Select previous stable deployment hash (e.g., commit prior to release).
3. Click **Instant Rollback / Promote to Production**.
4. Propagation time: < 30 seconds worldwide.

### 2.2 PWA Service Worker & Cache Invalidation
If obsolete cached scripts or styles linger on user devices:
1. Increment the cache version constant in `frontend/public/sw.js`:
   ```javascript
   const CACHE_NAME = 'nk-cache-v2'; // Bump version
   ```
2. In `sw.js` activate event, previous caches are automatically purged:
   ```javascript
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
       )
     );
   });
   ```
3. Deploy the updated `sw.js`. Browsers check byte-by-byte updates to `sw.js` on every navigation.

---

## 3. Backend Rollback Procedures

### 3.1 Containerized Rollback (Docker / Cloud Run / Kubernetes)
If the backend crashes or fails health probes:
1. Re-tag or redeploy the prior known-healthy image tag:
   ```bash
   gcloud run deploy namma-karnataka-backend --image gcr.io/namma-karnataka/backend:v0.1.0-stable
   ```
   Or on Kubernetes:
   ```bash
   kubectl rollout undo deployment/namma-karnataka-backend
   ```
2. Monitor `/health` and `/ready` endpoints until response status code is 200.

---

## 4. Database Migration Safety & Recovery

### 4.1 Expand / Contract Migration Strategy
- **Rule 1:** Never execute destructive `DROP COLUMN` or `DROP TABLE` in an active deployment.
- **Rule 2:** All schema changes must be backward-compatible with the immediately preceding backend release.
- **Rule 3:** If a migration fails during application, rollback transaction immediately:
  ```sql
  ROLLBACK;
  ```

### 4.2 Point-In-Time Database Recovery (PITR)
- Supabase provides automated continuous Write-Ahead Log (WAL) archiving.
- If data corruption occurs, restore database via Supabase Dashboard to the timestamp immediately prior to migration.

---

## 5. Emergency Incident Communication & Contacts

In the event of an outage:
1. Check `/health` endpoint to isolate backend vs frontend issue.
2. Check Supabase status page for database connectivity.
3. Switch user-facing status indicator to fallback mode (app automatically functions in offline/guest mode with cached catalogue).
