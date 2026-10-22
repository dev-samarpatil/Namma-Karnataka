# ADR-001: Monorepo Project Structure

* **Status:** `ACCEPTED`
* **Date:** October 2026
* **Deciders:** Lead Architect, Engineering Team

## Context
Namma Karnataka requires a tightly coupled yet modular development workflow across a React/TypeScript Single Page Application (`frontend`), a FastAPI/Python backend service (`backend`), Supabase database migrations (`supabase`), and architecture documentation (`docs`). As a regional MVP built by a lean engineering team, maintaining separate Git repositories creates high overhead for cross-tier contract changes (such as Pydantic-to-TypeScript schema synchronization) and release coordination.

## Options Considered
1. **Multi-Repository Architecture:** Independent repositories for frontend, backend, and documentation.
2. **Unified Monorepo Architecture:** Single Git repository hosting `frontend/`, `backend/`, `supabase/`, and `docs/`.

## Decision
Adopt a **Unified Monorepo Architecture** with clear directory isolation:
- `/frontend`: Vite, React, TypeScript, Tailwind, shadcn/ui.
- `/backend`: FastAPI, Python 3.11+, Pydantic v2.
- `/supabase`: Migrations and seed data.
- `/docs`: Architecture specifications, ADRs, risk register, and acceptance criteria.

## Consequences & Mitigations
- **Pros:** Atomic commits for cross-layer features; unified issue tracking; simplified CI pipelines; single source of truth for documentation and contracts.
- **Cons:** Shared Git history.
- **Mitigation:** Strict sub-directory isolation with independent package configurations (`package.json` and `pyproject.toml`) and independent CI job matrixes.
