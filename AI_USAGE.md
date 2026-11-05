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




---

## 5. Slice 3: Place Details, Reviews & Identity

### 5.1 Clarifications & Implementation Highlights
- **Scoped Identity Middleware**: In accordance with user guidance, `attachUser` was applied selectively rather than globally:
  - `GET /api/places/:id`: Optional identity, returning `myReview` if valid header provided; returning 401 `INVALID_USER` if invalid header supplied.
  - `PUT /api/places/:id/review`: Mandatory identity via `[attachUser, requireUser]`, rejecting missing header with 401 `USER_REQUIRED` and non-existent users with 401 `INVALID_USER`.
  - `GET /api/users` and `GET /api/health`: Unencumbered by identity.
- **Prisma Upsert Verification**: Avoided speculative assumptions or fallbacks. Executed a dedicated query logging probe confirming that Prisma 6 emits a single atomic PostgreSQL `INSERT ... ON CONFLICT ("place_id", "user_id") DO UPDATE` statement.
- **Review Validation**: Trimmed review body and verified $1 \le \text{length} \le 500$ characters. Strict integer rating $[1, 5]$.
- **Read-Only Tour Slots Preview**: Embedded tour slot schedule and availability information without mutations (reserved for Slice 4).

### 5.2 Verification & Test Results
- **Full Backend Suite**: 49 tests passing across 6 test files (`npm test -w server`).
- **Review & Detail Tests**: 16 dedicated integration tests in `tests/integration/reviews.test.ts` on `wayfarer_test`.
- **Database Safeguard**: Development database `wayfarer` audited before and after test execution (`users: 3, places: 10, reviews: 23, slots: 5, bookings: 6`).
- **Frontend Verification**: TypeScript passed (`npm run typecheck`) and Vite production build passed (`npm run build`).

---

## 6. Slice 4: Tour Slots & Safe Booking

### 6.1 Concurrency Bug Reproduction & Atomic Fix
- **Failing-Before Evidence**: Implemented a deliberate naive read-then-insert endpoint in `bookingService.ts`. Ran the 20-request parallel test (`Scenario A`), which triggered a race condition: multiple concurrent requests passed the application-level capacity check and attempted to increment `booked_seats` to 11 (exceeding capacity 10). PostgreSQL's check constraint `tour_slots_booked_within_capacity` halted the transaction with error code `23514`, causing 2 unhandled HTTP 500 errors and violating the test expectation of zero 500s.
- **Passing-After Fix**: Refactored `bookingService.bookSeats` to use a single conditional parameterized `UPDATE` statement inside `prisma.$transaction`. PostgreSQL row-level locks serialized concurrent requests on the slot row, ensuring that each subsequent request re-evaluates `booked_seats + seats <= capacity` against the latest committed state.
- **Result**: Exactly 2 requests succeeded (201), 18 requests returned 409 `SLOT_FULL`, 0 requests returned 500, and `assertSlotConsistent` passed across 5 consecutive runs.

### 6.2 Frontend Booking UI & Error Handling
- Built `TourSlotList.tsx` with row-level state management, interactive seat selection (capped at `min(seatsLeft, 10)`), pending state submission prevention, and friendly messaging on `SLOT_FULL` and `NOT_ENOUGH_SEATS` conflicts.
- Verified TypeScript checks and production builds without errors.

---

## 7. Slice 5: Integration, UX Completion & Quality Assurance

### 7.1 Backend Error Handling & Test Isolation
- **Verification of API Error Shapes**: Added comprehensive automated tests in `server/tests/health.test.ts` verifying that:
  - Unknown `/api/*` routes return 404 with structured JSON `{ error: { code: "NOT_FOUND", message: ... } }`.
  - Non-API routes return 404 HTML/text as standard.
  - Unhandled exceptions caught by Express 5 error handling return generic HTTP 500 `{ error: { code: "INTERNAL_ERROR", message: "An unexpected internal error occurred." } }` without exposing stack traces.
- **End-to-End Automated User Journey**: Created `server/tests/integration/e2eJourney.test.ts` exercising the entire user lifecycle sequentially against `wayfarer_test`:
  1. Explore places (`GET /api/places`).
  2. Filter by category & sort by name (`GET /api/places?category=History&sort=name`).
  3. Load place details (`GET /api/places/:id`).
  4. Query seeded users (`GET /api/users`).
  5. Submit new review as Bruno (`PUT /api/places/:id/review` with `X-User-Id: 2`).
  6. Edit review as Bruno (`PUT /api/places/:id/review` with `X-User-Id: 2`).
  7. Book seats as Bruno (`POST /api/slots/:id/bookings` with `X-User-Id: 2`).
  8. Book remaining seats to capacity as Carla (`POST /api/slots/:id/bookings` with `X-User-Id: 3`).
  9. Verify overbooking attempt rejected with 409 `SLOT_FULL`.
  10. Return to explore and confirm updated review count, average rating, and Bayesian score.

### 7.2 Photography Decision & Placeholder Refinement
- **Timebox & Design Audit**: Conducted an explicit review of the photography policy in Section 7.8 of `DEVELOPMENT_PLAN.md`.
- **Decision**: Maintained designed architectural placeholders rather than introducing external image files. Retaining SVG/CSS placeholders prevents license/copyright ambiguities, ensures zero external bandwidth overhead, and eliminates broken image links.
- **Hero Placeholder Band**: Refined `PlaceImage.tsx` with a `variant="hero"` prop. For venues without photography, the hero renders a compact ~120px placeholder band (`h-28 sm:h-32`) with clean icon and gradient background, keeping address, hours, ratings, and booking options above the fold on mobile and desktop.

### 7.3 Frontend UX & State Verification
- Audited contrast ratios against WCAG AA standards (all text tokens exceed 4.5:1; headings exceed 15:1).
- Confirmed responsive collapse at mobile (~390px) and tablet (~768px) breakpoints without horizontal scrolling.
- Confirmed both synthetic-data notices are prominently displayed in the footer and review section.
- Confirmed removal of any debugging logs, `alert()`, or `confirm()` invocations.
