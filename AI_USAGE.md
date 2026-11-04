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

---

## 4. Slice 2: Place Discovery & Bayesian Ranking

### 4.1 Clarifications & Design Decisions
- **Query Parameter Contract**: User clarified and mandated `sort=top-rated` and `sort=name`, with default `top-rated`. Handled invalid parameters like `sort=top` with explicit HTTP 400 `VALIDATION_ERROR`.
- **Global Prior Category Invariance**: User required that filtering by category (`?category=History`) must not recalculate the Bayesian prior $C$ from only the filtered subset. $C$ is computed across the entire review corpus in the system ($C = \text{global average rating}$, fallback $3.0$ if no reviews globally), guaranteeing that an attraction's Bayesian ranking score remains identical regardless of UI category filters applied.
- **Integration Test Isolation**: Tests in `server/tests/integration/places.test.ts` were built self-contained, creating predictable fixtures and cleaning them up so that test order does not bleed state. The zero-reviews fallback test explicitly operates within its own isolated fixture lifecycle.
- **Deterministic Tie-Breaking**: When two places calculate the identical Bayesian ranking score, ordering deterministically falls back to review count descending, then place name alphabetically ascending.

### 4.2 Implementation Summary
- **Backend Core**:
  - `server/src/lib/ranking.ts`: Pure Bayesian formula $\text{score} = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$ where $m=10$.
  - `server/tests/unit/ranking.test.ts`: 11 unit tests covering edge cases (zero reviews, single 5-star review vs. many 4.5 reviews, global fallback, mathematical limits, tie-breakers).
  - `server/src/lib/errors.ts` & `server/src/middleware/errorHandler.ts`: Standardized error hierarchy and Express 5 error handling.
  - `server/src/lib/validation.ts`: Parsing and validation helpers for sorting and category filtering.
  - `server/src/services/placeService.ts` & `server/src/controllers/placeController.ts`: Aggregate query executing a single global average query and a grouped aggregation for places, computing scores and applying sorting.
  - `server/tests/integration/places.test.ts`: 8 integration tests against `wayfarer_test`.
- **Frontend Core**:
  - `client/src/types/index.ts`, `client/src/services/api.ts`, `client/src/hooks/useApi.ts`: Type definitions and declarative API hook.
  - `client/src/components/*`: `AppHeader`, `CategoryFilter`, `SortSelect`, `PlaceCard`, `PlaceImage` (with 3:2 aspect ratio preservation and SVG placeholder), and `StatusMessage` (with loading skeletons, empty state, and error handling).
  - `client/src/pages/ExplorePage.tsx` & `client/src/App.tsx`: Main discovery view integrating filters, sort dropdown, and grid layout.

### 4.3 Verification Results
- **Unit & Integration Tests**: 33 tests passing (`npm test -w server`).
- **Type Checking & Build**: `npm run typecheck` returned 0 errors across client and server; `npm run build` completed successfully.
- **Dev Database Integrity**: Verified that `wayfarer` development database remained pristine (`users: 3, places: 10, reviews: 23, slots: 5, bookings: 6`).
- **Live Endpoint Verification**: Queried live server on port 3001 using curl:
  - Default `GET /api/places`: Highest score was *Oceanário de Lisboa* (score 4.673, 5 reviews, avg 4.80), ahead of *Pastéis de Belém* (1 review, avg 5.0, score 3.962).
  - Sorting `GET /api/places?sort=name`: Returned alphabetical ordering starting with *Castelo de São Jorge*.
  - Category `GET /api/places?category=History`: Returned 2 historical landmarks with scores identical to the unfiltered endpoint.
  - Error `GET /api/places?sort=invalid`: Returned 400 `VALIDATION_ERROR`.



