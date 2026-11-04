# Wayfarer — AI Usage Log

This document transparently records the use of AI tools during the development of Wayfarer, including tools used, prompts, decisions, verified outputs, and corrections.

---

## 1. Tooling Overview

- **Primary AI Assistant**: Antigravity (Powered by Gemini)
- **Role**: Pair programming, codebase analysis, file editing, build and test verification, and documentation tracking.

---

## 2. Inception & Slice 0: Foundation

### 2.1 Planning & Documentation Analysis
- **Context**: The repository began with two planning documents (`DEVELOPMENT_PLAN (1).md` and `Wayfarer Engineering Blueprint.md`).
- **AI Task**: Read both documents, identify contradictions, and inspect the local environment to plan the Slice 0 walking skeleton.
- **Key Prompt Summary**: "Before doing anything: Read all the project documentation carefully... Treat existing documents as the source of truth... Identify any contradictions... For Slice 0: First, inspect the repository and report..."
- **What the Assistant Found**:
  - Filename divergence: `DEVELOPMENT_PLAN (1).md` on disk vs. `DEVELOPMENT_PLAN.md` in documentation references.
  - Model discrepancies: `Place.address` and `Place.imageUrl` were specified in the Development Plan but omitted in the Blueprint.
  - Endpoint discrepancies: Blueprint used `/api/places/:placeId` with `slots`, while the Development Plan standardized on `/api/places/:id` and `tourSlots`.
  - Max seats validation: Blueprint mentioned ~20 seats as an upper bound, while the Development Plan fixed `MAX_SEATS_PER_BOOKING = 10` on the backend.

### 2.2 Caught Assumption / Correction
- **The Issue**: Both original planning documents heavily assumed Docker was available (`docker-compose.yml`, `docker compose up -d --wait`). The environment check revealed that `docker` was not installed on the system, while native PostgreSQL 18 was installed in `C:\Program Files\PostgreSQL\18`.
- **User Decision**: The user explicitly instructed:
  1. Remove Docker completely from the workflow and all documentation.
  2. Use the local PostgreSQL 18 service with two dedicated databases: `wayfarer` (development) and `wayfarer_test` (tests).
  3. Rename `DEVELOPMENT_PLAN (1).md` to `DEVELOPMENT_PLAN.md`.
- **Action Taken**: Refactored `DEVELOPMENT_PLAN.md` and `Wayfarer Engineering Blueprint.md` to remove all Docker references, eliminate `docker-compose.yml`, and enforce strict test database isolation using `wayfarer_test`.

### 2.3 Implementation of Slice 0
- Scaffolding the monorepo structure with npm workspaces (`server` and `client`).
- Setting up Express 5, React 19, Tailwind CSS v4, and Prisma 6.
- Implementing active PostgreSQL connectivity checking via `GET /api/health`.

---

## 3. Slice 1: Database Foundation & Seed Data

### 3.1 Clarifications Incorporated
- User directed strict seed safety (verifying database name is `wayfarer` before truncation, preventing seed execution on `wayfarer_test`).
- Synchronized PostgreSQL sequence `users_id_seq` after fixed IDs (1–3) are seeded to prevent primary key collisions on auto-increments.
- Formulated `assertTestDatabase` guard and `assertSlotConsistent` invariant auditor.
- Documented accurately that Prisma `@updatedAt` is an application-level query engine behavior, not a PostgreSQL trigger.

### 3.2 Verification & Troubleshooting Note
- **Issue**: In `vitest.config.ts`, setting `process.env.DATABASE_URL = testUrl` at the top level caused `globalSetup.ts` to see `DATABASE_URL` already mutated to `TEST_DATABASE_URL`, triggering `assertTestDatabase` to correctly catch that dev and test URLs were identical and abort execution.
- **Fix**: Retained the original development database URL in `DEV_DATABASE_URL` so that `globalSetup.ts` can reliably assert separation before worker process environment overrides occur.
- **Evidence**: Executed `npm test -w server` (all 14 tests passed on `wayfarer_test`), followed by auditing `wayfarer` development database row counts (`users: 3, places: 10, reviews: 23, slots: 5, bookings: 6`), proving zero data loss or test leakage.


