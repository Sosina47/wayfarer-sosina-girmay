# Wayfarer — Architectural & Technical Decisions

This document records architectural decisions, evaluated alternatives, rejected approaches, and working assumptions for Wayfarer. It is updated incrementally with each vertical slice.

---

## 1. Project Inception & Foundation (Slice 0)

### 1.1 Local PostgreSQL vs. Docker Containerization
- **Decision**: Use a locally installed PostgreSQL 18 service on Windows (`localhost:5432`) with two dedicated databases: `wayfarer` for development and `wayfarer_test` for automated tests. Docker is excluded from the workflow.
- **Alternatives Rejected**:
  - *Docker Compose*: Requires Docker Desktop running, which adds overhead and daemon dependency on developer workstations where PostgreSQL 18 is already natively installed.
  - *Shared database with separate schemas (`?schema=test`)*: While theoretically supported by PostgreSQL, Prisma migrations and raw SQL can experience cross-schema search-path ambiguity. Separate physical databases (`wayfarer` and `wayfarer_test`) provide absolute isolation.
- **Consequences**:
  - Setup requires running the local PostgreSQL 18 service and ensuring `wayfarer` and `wayfarer_test` databases exist.
  - Test safety is guaranteed by strict database name checking before running any migrations or test truncations.

### 1.2 Monorepo Architecture & Package Management
- **Decision**: Single repository using native npm workspaces (`client`, `server`) and root-level orchestration scripts.
- **Alternatives Rejected**:
  - *Turborepo / Nx*: Unnecessary tooling overhead and configuration complexity for a two-package project. Native npm workspaces meet all requirements cleanly.
  - *Shared package for types*: Introducing a third workspace for types creates build ordering dependencies and symlink issues. Types are maintained cleanly in client and server (drift risk acknowledged and monitored).

### 1.3 Express Application / Server Separation
- **Decision**: Split backend into `src/app.ts` (builds Express app, registers middlewares and routes) and `src/server.ts` (starts HTTP listener on `PORT`).
- **Why**: Integration tests using Supertest can import `app` directly and execute in-memory HTTP requests without port collisions or lingering socket handles.

### 1.4 Vite Dev Proxy vs. CORS
- **Decision**: Use Vite dev server proxy to forward all `/api` requests to `http://localhost:3001`.
- **Why**: Eliminates Cross-Origin Resource Sharing (CORS) preflight complexity during local development, particularly when custom headers like `X-User-Id` are transmitted.

---

## 2. Working Assumptions and Ambiguity Resolutions

The following table records the project assumptions established in Section 2.3 of `DEVELOPMENT_PLAN.md`:

| # | Ambiguity | Resolution | Rationale |
|---|---|---|---|
| 1 | Three users review cap | Exactly 3 seeded users. Places have 0–3 reviews in live data. | The assignment specifies 3 users. Large-scale ranking behavior (e.g. 312 reviews) is proven through unit tests of the pure scoring function. |
| 2 | Multiple bookings per slot | Allowed. Each booking creates a distinct `Booking` row. | Simpler model; real users may book on separate occasions. |
| 3 | Seats per booking limits | Integer between 1 and 10, enforced strictly on the backend (`MAX_SEATS_PER_BOOKING = 10`). | Protects against unreasonable input while accommodating small groups. |
| 4 | Past slots | Seed only future slots relative to seed execution time. | Avoids stale demo data without requiring complex historical scheduling logic. |
| 5 | Review constraints | Whole stars (1–5) and trimmed text between 1 and 500 characters required. | Aligns with "rating plus short text" requirement. |
| 6 | Cancellations & Booking History | Out of scope. Immediate confirmation response serves as receipt. | Focuses time on core requirements (ranking and concurrency safety). |
| 7 | Zero reviews place | Neutral prior: global mean `C` if reviews exist, or midpoint `3.0` if no reviews exist anywhere. | Principled Bayesian default; prevents division by zero. |
| 8 | Time zones | Store UTC (`timestamptz`), format in browser locale. | Industry best practice; avoids timezone conversion drift. |
| 9 | Place search field | Omitted. Filter by category covers requirements. | Avoids unnecessary query complexity and UI state overhead. |
| 10 | Sort options | `top` (Bayesian weighted score) and `name` (alphabetical A–Z). | Provides baseline comparison against standard alphabetical order. |
| 11 | Place photography | Up to 5 licensed photos; deliberate placeholder component for all other places. | Prevents image sourcing from blocking implementation on the critical path. |
| 12 | Seats freshness | Refetched on user actions; stale state handled gracefully by HTTP 409 conflict. | Real-time WebSockets/polling out of scope. |
| 13 | Demo reviews | All reviews are explicitly labelled synthetic demonstration data. | Ethical clarity without altering schema. |
| 14 | Test database configuration | `TEST_DATABASE_URL` is required and must target `wayfarer_test`. | Absolute isolation prevents accidental developer data loss. |

---

## 3. Database Foundation & Seed Data (Slice 1)

### 3.1 Composite Unique Constraint for Review Uniqueness
- **Decision**: Define `@@unique([placeId, userId])` in `schema.prisma` generating `UNIQUE (place_id, user_id)` in PostgreSQL.
- **Why**: Guarantees one review per user per place at the database engine level. In Slice 3, review creation/update targets this constraint via Prisma `upsert`. Concurrency safety will be verified with integration tests rather than assuming unverified library behavior.
- **Alternatives Rejected**:
  - *Application-level check (find then insert)*: Vulnerable to race conditions where two simultaneous submissions by the same user both see no existing review and attempt inserts.

### 3.2 Counter `bookedSeats` vs. Derived Sum
- **Decision**: Maintain a denormalized `bookedSeats` counter on `TourSlot` with an invariant `bookedSeats == SUM(booking.seats)`, enforced by single write path, interactive transaction, and a PostgreSQL `CHECK (booked_seats BETWEEN 0 AND capacity)`.
- **Why**: Check-and-reserve can be accomplished in a single atomic SQL statement (`UPDATE tour_slots SET booked_seats = booked_seats + $n WHERE id = $id AND booked_seats + $n <= capacity`), avoiding row-lock holding across multiple statements.
- **Alternatives Rejected**:
  - *Deriving seats from SUM(bookings.seats)*: Requires `SELECT ... FOR UPDATE`, summing rows, comparing in application code, and inserting. Correct, but more moving parts and lock held across three statements.

### 3.3 Hand-Edited CHECK Constraints
- **Decision**: Append named `CHECK` constraints to Prisma migration SQL (`rating BETWEEN 1 AND 5`, `capacity > 0`, `booked_seats BETWEEN 0 AND capacity`, `seats > 0`).
- **Why**: Serves as the database's independent defense: even if application validation contains a flaw, PostgreSQL refuses invalid data.

### 3.4 Explicit Auto-Increment Sequence Synchronization
- **Decision**: After seeding users with fixed IDs (1–3), run `SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1))` to advance PostgreSQL's sequence.
- **Why**: Explicit primary key insertion does not automatically advance sequences in PostgreSQL; advancing it prevents PK collisions on future auto-generated inserts.

### 3.5 Prisma `@updatedAt` Semantics
- **Documented Reality**: `@updatedAt` is maintained by the Prisma Client query engine at the application layer when issuing `update`/`upsert` calls. Arbitrary raw SQL queries do not update this timestamp unless explicitly set.

### 3.6 Test Database Isolation Strategy
- **Decision**: Physical separation into `wayfarer` (development) and `wayfarer_test` (tests) with pre-connection and runtime assertions.
- **Why**: Tests truncate tables. A mandatory `TEST_DATABASE_URL` checked before connection and runtime verification of `SELECT current_database()` completely prevents developer data loss.

---

## 4. Place Discovery, Filtering & Bayesian Ranking (Slice 2)

### 4.1 Ranking Formula and Parameter Selection
- **Formula**:
  $$\text{score} = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$
  where $v$ is the venue's review count, $R$ is its average rating, $C$ is the global mean rating across all reviews, and $m = 10$.
- **Why $m = 10$**:
  A venue must accumulate 10 reviews before its own average carries equal weight (50%) to the prior. With $v = 1$, the single review contributes only $\sim 9\%$ of the weight, preventing newly opened venues with a single 5★ review from leaping ahead of established, well-reviewed venues.
- **Fallback for Zero Reviews**:
  When a venue has no reviews ($v = 0$), its score equals $C$. If the entire database has 0 reviews, $C$ falls back to the scale midpoint $\text{NEUTRAL\_PRIOR\_RATING} = 3.0$.
- **Where it breaks**:
  - Cold-start penalty: Truly exceptional new venues are pulled toward the average until they accumulate enough reviews.
  - Review spam: The formula does not incorporate recency or fraud detection.
  - Dominated by prior in small samples: Because the assignment caps live users at 3, demo scores remain clustered around $C$. The large-sample case is verified in unit tests.

### 4.2 Global Mean Scope Invariance
- **Decision**: Global average $C$ is calculated across **all** reviews in the database, not restricted to the filtered category.
- **Why**: Ensures that applying a category filter does not recalculate $C$ on a noisy, smaller sample or cause a place's ranking score to shift when filtered. This property is strictly verified by integration tests.

### 4.3 Sorting Parameter Contract
- **Decision**: Standardize API sorting parameter on `sort=top-rated` (default) and `sort=name`.
- **Why**: Replaces preliminary `sort=top` references with the user-agreed contract `top-rated` and returns deterministic ordering via tie-breaking comparators (score descending $\rightarrow$ review count descending $\rightarrow$ name ascending).




---

## 5. Place Details, Review Upsert & Acting-as Identity (Slice 3)

### 5.1 Prisma Upsert Verification & Concurrency Characteristics
- **Decision**: Use Prisma's composite-key `upsert` (`where: { placeId_userId: { placeId, userId } }`) directly without speculative application-level catch-and-retry fallbacks.
- **Empirical SQL Verification**: Using active Prisma query logging on PostgreSQL 18, the exact SQL statement generated by Prisma 6 for this composite unique key was captured:
  ```sql
  INSERT INTO "public"."reviews" ("place_id", "user_id", "rating", "body", "created_at", "updated_at")
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT ("place_id", "user_id")
  DO UPDATE SET "rating" = $7, "body" = $8, "updated_at" = $9
  WHERE (("public"."reviews"."place_id" = $10 AND "public"."reviews"."user_id" = $11) AND 1=1)
  RETURNING ...
  ```
- **Concurrency Guarantee**: Because Prisma translates this query shape directly into PostgreSQL's native `INSERT ... ON CONFLICT DO UPDATE`, the operation is atomic at the database storage engine level. No preliminary `SELECT` is issued, eliminating race conditions between concurrent requests.

### 5.2 Scoped Acting-As Identity Middleware
- **Decision**: Rather than binding `attachUser` globally across all endpoints, apply identity middleware selectively:
  - `GET /api/places/:id`: Uses `attachUser` (optional identity). When `X-User-Id` is provided, it validates the user and populates `myReview`; when absent, `myReview` returns `null`.
  - `PUT /api/places/:id/review`: Uses `[attachUser, requireUser]` (mandatory identity). Missing `X-User-Id` returns 401 `USER_REQUIRED`; invalid/non-existent user returns 401 `INVALID_USER`.
  - `GET /api/users` and `GET /api/health`: Completely unencumbered by identity checks.

### 5.3 Review Validation & Normalization
- **Decision**: Validate `rating` strictly as an integer in $[1, 5]$ (rejecting numeric strings and floats). Trim `body` before validation and persistence, enforcing length between 1 and 500 characters per SRS RV-1.

---

## 6. Tour Booking Concurrency, Atomic Strategy & Invariants (Slice 4)

### 6.1 The Overbooking Race Condition in Naive Read-then-Write
- **Vulnerability**: In standard `READ COMMITTED` isolation, if 20 concurrent requests arrive when 2 seats remain, multiple requests query `findUnique` simultaneously. Each reads `bookedSeats = 8`, concludes that seats are available, inserts a booking, and attempts to increment the counter.
- **Empirical Evidence**: Running the concurrency test against the naive read-then-write implementation crashed PostgreSQL with:
  `PostgresError { code: "23514", message: "new row for relation \"tour_slots\" violates check constraint \"tour_slots_booked_within_capacity\"", detail: "Failing row contains (10, 1, ..., 10, 11)" }`
  This triggered HTTP 500 errors and broke the invariant `bookedSeats = SUM(Booking.seats)`.

### 6.2 The Atomic Solution: Conditional SQL UPDATE in an Interactive Transaction
- **Decision**: Execute a single parameterized conditional `UPDATE` statement inside `prisma.$transaction`:
  ```sql
  UPDATE tour_slots
  SET booked_seats = booked_seats + $seats
  WHERE id = $slotId
    AND booked_seats + $seats <= capacity;
  ```
- **Why It Works**:
  1. PostgreSQL takes an exclusive row-level lock on the `tour_slots` row for the duration of the transaction.
  2. Concurrent updates on the same slot block and serialize.
  3. Under `READ COMMITTED`, once the lock is released by a committing transaction, waiting transactions re-evaluate the `WHERE` condition against the newly updated committed row. If remaining capacity is insufficient, the condition fails.
  4. If 0 rows are affected, the transaction reads the slot to return 404, 409 `SLOT_FULL`, or 409 `NOT_ENOUGH_SEATS` (`{ details: { seatsLeft } }`), and rolls back cleanly.
  5. If 1 row is affected, the `Booking` record is inserted in the same transaction, guaranteeing that the counter increment and booking record commit together atomically.

### 6.3 Explicit Transaction Timeouts
- Explicit interactive transaction parameters:
  - `maxWait: 5000`: Wait up to 5 seconds to acquire a connection from the Prisma connection pool under contention.
  - `timeout: 10000`: Allow up to 10 seconds for the transactional callback to finish.

### 6.4 Consistency Invariant
- **Invariant**: `TourSlot.bookedSeats = SUM(Booking.seats)`.
- Reusable test helper `assertSlotConsistent(prisma, slotId)` validates this invariant using a SQL query after every test scenario.

### 6.5 Alternatives Considered & Rejected
| Alternative | Why Considered | Why Rejected |
|---|---|---|
| `SELECT ... FOR UPDATE` + sum bookings + insert | Traditional pessimistic lock | Requires 3 round-trip queries while holding the lock across application code. |
| `SERIALIZABLE` isolation + retry loop | Highest SQL isolation standard | Surfaces serialization failure errors (`40001`) to application code, requiring complex retry heuristics. |
| Application-level In-Memory Mutex | Simple in single-thread Node.js | Completely ineffective across multiple Node.js worker processes or server instances. |
| Advisory Locks (`pg_advisory_xact_lock`) | Explicit application-controlled locks | Obscure, easy to misconfigure, and unnecessary given row-level locks on the actual slot row. |
| Prisma `updateMany` with `where: { bookedSeats: { lte: capacity - n } }` | ORM-only approach | Requires assuming `capacity` is static and known ahead of time. |

### 6.6 Known Limitations
- Counter and Booking records could drift if direct database modifications bypass this code path (guarded by the database CHECK constraint).
- Booking cancellation and decrement paths are intentionally not implemented in this release.
- High contention on a single slot serializes waiting requests by design.
