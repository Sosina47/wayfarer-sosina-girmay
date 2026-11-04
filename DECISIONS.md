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

