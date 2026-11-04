# Wayfarer — Development Plan

> **Tagline:** Honest ratings, fair bookings.
> **Status:** Primary source of truth for implementation. If code and this document disagree, fix one of them in the same commit.
> **Budget:** 4.5 focused hours (4–5 h assignment window).
> **Revision 2:** incorporates the approved Appendix B clarifications (synthetic-data labelling, 4–5 photos, explicit `TEST_DATABASE_URL`, consistency rules for `bookedSeats`, quality gates, critical-path protection). Appendix B lists what changed.

---

## 0. How to use this document (read first)

This plan is written so a coding agent (or you) can implement Wayfarer without inventing architecture. Follow these rules:

1. **Work slice by slice, in order** (Section 8). Each slice ends in working, tested, committed software. Do not start a slice before the previous one meets its acceptance criteria.
2. **Do not add dependencies** beyond the allow-list in Section 3.4. If something seems to need a new dependency, write the reason in `DECISIONS.md` first and prefer a 10-line hand-written alternative.
3. **Do not change API contracts, the schema, or the UI spec silently.** If a change is needed, edit this plan in the same commit.
4. **Do not add features** that are not in Section 2. No bonuses until Slice 6 is complete and there is time left.
5. **When something is ambiguous, use the documented default** (Section 2.3). If no default exists, choose the simplest option and record it in `DECISIONS.md`.
6. **Items marked ⚠ verify** depend on library versions that change often (Prisma, Tailwind, Vitest, Express). Check the official docs for the installed version before relying on them, and pin versions.
7. **Commit after every task that leaves the app working** (Section 11). Never squash or rewrite history.
8. **Update documentation in the same commit** as any change that makes it inaccurate.
9. **Protect the critical path.** Ranking (Slice 2) and PostgreSQL-safe booking (Slice 4) are the two mandatory, highest-weighted behaviors. Anything optional (photos, polish, convenience features) stops immediately when a checkpoint in Section 12 is behind schedule.
10. **Never let tests touch the development database.** Tests require an explicit `TEST_DATABASE_URL` and fail safely without it (Section 9.2).

---

## 1. Project overview

Wayfarer lists places in **Lisbon**, lets travellers review them, and lets them book seats on guided tours. It fixes two specific bugs by design:

| Bug in the "old app" | Fix by design |
|---|---|
| A café with one 5★ review outranks a museum with 312 reviews averaging 4.7. | "Top rated" uses a **Bayesian weighted average** that shrinks small-sample averages toward the global mean. |
| Two people book the last seat at the same instant and both get confirmations. | Booking uses **one atomic conditional `UPDATE`** plus the booking insert in **one PostgreSQL transaction**, backed by a `CHECK` constraint and proven by a **parallel integration test on real PostgreSQL**. |

**Two screens only:** Explore and Place Details. Booking, reviews and the user switcher live inside those two screens.

### 1.1 Reasoning about scope

The assignment rewards a defensible ranking formula, provably safe booking, clear explanations, small commits, and honest AI disclosure far more than extra features. Everything below is chosen to protect those.

### 1.2 Critical path (protected)

Two behaviors decide the outcome: **(1) the ranking formula with its unit test** and **(2) atomic booking with a parallel test on real PostgreSQL**. The plan protects them in five ways:

- They get the largest, earliest time blocks (Slice 2 = 55 min, Slice 4 = 60 min) and explicit time checkpoints (Section 12).
- **Slice 4a** (booking backend + parallel test) needs only Slice 1, the backend plumbing from Slice 2 and the identity middleware from the first task of Slice 3. If Slice 3 is running late, finish at the next green commit and do 4a before the rest of Slice 3.
- Safe test infrastructure (`TEST_DATABASE_URL` guard) is part of the critical path, because the concurrency test truncates tables.
- Optional work (photos, `sort=name`, URL persistence, polish) is cut first.
- The ranking test and Scenario A of the concurrency test are on the "never cut" list.

---

## 2. Requirements

### 2.1 Mandatory checklist

Each requirement has an ID used in the traceability matrix (Appendix A).

**Identity**

- [ ] **ID-1** Three users are seeded.
- [ ] **ID-2** The frontend has an "Acting as" switcher.
- [ ] **ID-3** The frontend sends the acting user in an `X-User-Id` header.
- [ ] **ID-4** The backend validates that the user exists.
- [ ] **ID-5** Docs state plainly this is a demo identity mechanism, not security.

**Places**

- [ ] **PL-1** One city (Lisbon), used consistently.
- [ ] **PL-2** About ten seeded places in several categories.
- [ ] **PL-3** At least one place with only 1–2 reviews.
- [ ] **PL-4** Place list (Explore) UI.
- [ ] **PL-5** Category filter, **performed by the backend**.
- [ ] **PL-6** "Top rated" sort, **performed by the backend**.
- [ ] **PL-7** Place details view.
- [ ] **PL-8** A seed command, idempotent (safe to re-run).

**Reviews and ranking**

- [ ] **RV-1** Rating 1–5 plus short text.
- [ ] **RV-2** One review per user per place, enforced by a database unique constraint.
- [ ] **RV-3** Reviewing again updates the existing review.
- [ ] **RV-4** Top-rated ranking accounts for review count.
- [ ] **RV-5** Formula and parameters are explained (`DECISIONS.md`).
- [ ] **RV-6** Automated ranking unit test.
- [ ] **RV-7** Defined behavior with zero reviews anywhere (documented neutral prior).
- [ ] **RV-8** All reviews are clearly labelled **synthetic demonstration data** (seed file, UI notices, README).

**Tour booking**

- [ ] **BK-1** Tour slots have a start time and capacity.
- [ ] **BK-2** Users can book one or more seats.
- [ ] **BK-3** Remaining seats are displayed.
- [ ] **BK-4** Capacity check and reservation are atomic.
- [ ] **BK-5** The Booking row is created in the same transaction.
- [ ] **BK-6** A failed booking leaves no counter change.
- [ ] **BK-7** Parallel integration test on **real PostgreSQL**.
- [ ] **BK-8** A full slot shows a friendly message, not an error page.

**Quality and process**

- [ ] **Q-1** Desktop-friendly UI.
- [ ] **Q-2** Loading states.
- [ ] **Q-3** Error states.
- [ ] **Q-4** Empty states.
- [ ] **Q-5** Friendly booking confirmation.
- [ ] **Q-6** One command runs the required tests.
- [ ] **Q-7** Runs from a fresh clone in ≤3 commands, documented.
- [ ] **Q-8** `README.md`, `DECISIONS.md`, `AI_USAGE.md` (plus `docs/PROJECT_GUIDE.md`).
- [ ] **Q-9** Small, meaningful commit history; no secrets, `node_modules` or build output committed.
- [ ] **Q-10** Server and client TypeScript checks, the client production build, and all backend tests pass (`npm run verify`).
- [ ] **Q-11** Tests require an explicit `TEST_DATABASE_URL` and fail safely (before touching any database) if it is missing, equal to the dev URL, or not clearly a test target.

**Design**

- [ ] **UX-1** Dark mode only, warm palette.
- [ ] **UX-2** Exactly two screens.
- [ ] **UX-3** No browser `alert()` for normal feedback.

### 2.2 Explicitly out of scope

Authentication, payments, maps, notifications, booking cancellation, a "my bookings" page, admin tools, place search (see 2.3 #9), pagination, real-time seat updates, a frontend test framework, ESLint configuration for the server, state-management libraries, UI component libraries, animations, and every optional bonus (mobile polish, idempotency keys, custom idea) until Slice 6 is finished with spare time.

### 2.3 Ambiguities and the defaults this plan uses

Record each of these in `DECISIONS.md`.

| # | Ambiguity | Default | Why |
|---|---|---|---|
| 1 | Three users ⇒ each place has at most 3 reviews (unique per user/place). The "312 reviews" story cannot occur in live data. | Keep exactly 3 users. Prove the large-count case in the **unit test** (pure function takes plain numbers). State the limitation in `DECISIONS.md`. | The assignment fixes 3 users; extra users would clutter the switcher. |
| 2 | Can one user book the same slot twice? | Yes. Each booking is a separate row. | Simplest, nothing forbids it. |
| 3 | Seats per booking limits | Integer 1–10, **validated on the backend** via one constant (`MAX_SEATS_PER_BOOKING = 10`), also bounded by seats left. The UI mirrors the limit but is never the authority. | Prevents absurd input; still allows groups. |
| 4 | Slots in the past | Seed only future slots (relative to seed time). No "already started" check. | Out of scope; documented limitation. |
| 5 | Review text | Required, 1–500 characters after trimming. Whole-star ratings only. | Spec says "short text". |
| 6 | Cancelling or listing bookings | Not supported. The booking response/inline message is the confirmation. | Not required. |
| 7 | Place with zero reviews | Displayed as "No reviews yet"; scored with the neutral prior: the global average when any review exists, otherwise the scale midpoint `3.0` (Section 5.8). | Neutral, defensible, no division by zero. |
| 8 | Time zones | Store UTC (`timestamptz`), format in the browser's locale/time zone. | Simplest correct approach. |
| 9 | Place search field | **Omitted.** | Not required; backend filtering is already covered by category; it would add a query parameter, tests and UI states. |
| 10 | Sort options | `top` (default) and `name` (A–Z). | Needs a usable control; `name` is nearly free. First thing to cut. |
| 11 | Place photography | **4–5 properly licensed photos at most**, committed under `client/public/places/` and referenced by `Place.imageUrl`; every other place uses a deliberate placeholder. Sourcing is time-boxed and optional (Section 7.8). | Image sourcing must never delay implementation. |
| 12 | "Seats left" freshness | Refetched after your own actions; stale views are covered by the 409 response. | Real-time updates are out of scope. |
| 13 | Fake reviews | Every seeded review is **synthetic demonstration data**, labelled in the seed file, the UI (Explore footer, Reviews section) and the README. Reviews typed in the demo are demo data too, so one dataset-level label is accurate. | Honesty without schema changes. |
| 14 | Test database configuration | `TEST_DATABASE_URL` is required; no fallback to `DATABASE_URL`; tests fail safely when it is missing or unsafe (Section 9.2). | Tests truncate tables and must never wipe dev data. |

### 2.4 What reviewers are evaluating (and what that means here)

| Weight | Area | Consequence for this plan |
|---|---|---|
| 25% | Problem solving | Ranking formula and booking safety are explained with alternatives, trade-offs and failure modes in `DECISIONS.md`. |
| 20% | Working software | Fresh-clone dry run in Slice 6 is mandatory. |
| 15% | Code quality | Thin controllers, logic in services/`lib`, no logic in React components. |
| 15% | Git history | Commit table in Section 11; roughly 25–40 commits. |
| 10% | Testing | Two required tests focus on the risky behavior; others are small and purposeful. |
| 10% | AI transparency | `AI_USAGE.md` is written as you go, including real mistakes. |
| 5% | UX | Clear states beat polish. |

---

## 3. Architecture overview

```mermaid
flowchart LR
    subgraph Browser
      UI[React + Tailwind<br/>Explore / Place Details]
    end
    subgraph "Node.js (Express, TypeScript)"
      R[Routes] --> C[Controllers]
      C --> S[Services]
      S --> P[Prisma Client]
      S --> L[lib/ranking.ts<br/>pure functions]
    end
    DB[(PostgreSQL)]
    UI -- "HTTP /api/* + X-User-Id" --> R
    P --> DB
```

### 3.1 Principles

- The browser talks only to Express over HTTP and **never** to PostgreSQL.
- In development, Vite proxies `/api` to Express, so there is **no CORS configuration** (a custom `X-User-Id` header would otherwise trigger preflight requests).
- Business rules live in **services** and **`lib/`**; controllers translate HTTP to service calls and back; React components render and call API functions.
- **No repository layer.** Prisma is the data-access layer. Services call Prisma directly.
- **No shared package.** Types are duplicated in `client/src/types` and kept small (drift risk noted in `DECISIONS.md`).

### 3.2 Layer responsibilities

| Layer | Does | Does not |
|---|---|---|
| `routes/` | Map method + path to a controller (and attach middleware). | Contain logic. |
| `controllers/` | Parse and validate request input, call **one** service function, shape the HTTP response. | Touch Prisma or contain business rules. |
| `services/` | Business rules, database access via Prisma, transactions, throwing typed errors. | Know about `req`/`res`. |
| `lib/` | Pure helpers: `ranking.ts`, `validation.ts`, `errors.ts`, `prisma.ts`, `env.ts`. | Perform I/O (except `prisma.ts`/`env.ts`). |
| `middleware/` | `attachUser` (acting-as), `requireUser`, `errorHandler`, `notFound`. | Contain feature logic. |
| Client `pages/` | Compose a screen: fetch data, hold page state, arrange components. | Compute ranking/capacity or build raw `fetch` calls. |
| Client `components/` | Presentational pieces reused or large enough to deserve a file. | Call `fetch` directly (booking/review forms receive callbacks or call `services/api`). |
| Client `services/api.ts` | The only place that calls `fetch`, adds `X-User-Id`, parses error bodies. | Hold UI state. |

### 3.3 Express request flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as attachUser middleware
    participant R as Route
    participant C as Controller
    participant S as Service
    participant D as PostgreSQL
    B->>M: POST /api/slots/7/bookings (X-User-Id: 2)
    M->>D: SELECT user 2
    M->>R: req.user attached
    R->>C: requireUser, then controller
    C->>C: validate params/body
    C->>S: bookSeats(userId, slotId, seats)
    S->>D: transaction (atomic UPDATE + INSERT)
    S-->>C: result or typed error
    C-->>B: 201 JSON or error JSON via errorHandler
```

### 3.4 Dependency allow-list

| Workspace | Runtime | Dev |
|---|---|---|
| root | — | `concurrently` |
| `server` | `express`, `@prisma/client`, `dotenv` | `prisma`, `typescript`, `tsx`, `vitest`, `supertest`, `@types/express`, `@types/node`, `@types/supertest` |
| `client` | `react`, `react-dom`, `react-router-dom`, `@fontsource-variable/figtree` (optional) | `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `@types/react`, `@types/react-dom` |

Why each non-obvious entry exists:

- `dotenv`: Prisma 7-style setups no longer load `.env` automatically and `tsx` doesn't either; one explicit import in `lib/env.ts` is clearer than flags. ⚠ verify for the Prisma version you install.
- `react-router-dom`: gives the detail page a real URL (`/places/:id`) and a working Back button.
- `@fontsource-variable/figtree`: bundles the font locally (no network at runtime). If it causes friction, fall back to the system font stack.
- `concurrently`: one `npm run dev` starts both servers.
- No Zod, React Query, Redux, Axios, UI kit, icon library or CSS-in-JS. Icons are plain inline SVG or Unicode (★).
- No frontend test framework (not required; the client is covered by TypeScript checking and the production build). No ESLint setup for the server. The Vite template's client ESLint config may stay as generated but is **not** a quality gate.

### 3.5 Version and tooling notes (⚠ verify each)

- **Node:** use the current LTS; add `.nvmrc` and `engines` in the root `package.json`.
- **Express 5** forwards rejected promises from async handlers to the error middleware. With Express 4 an async throw hangs the request. Check `npm ls express`; if v4, wrap handlers or upgrade.
- **Prisma:** pin the version. Prisma 7 changed setup (`prisma.config.ts`, explicit driver adapter, no automatic `.env` loading). Follow only the docs for the version you install and do not mix tutorials.
- **Tailwind:** v4 uses `@tailwindcss/vite` and CSS-first `@theme`; v3 uses PostCSS config. Follow the official install page for the installed major only.
- **Vitest:** the option to run test files serially is `fileParallelism: false` in recent versions (older versions used `poolOptions`/`singleThread`). Check the installed version.
- **Database URL wiring:** the app and Prisma only know `DATABASE_URL`. For tests, `vitest.config.ts` injects the value of `TEST_DATABASE_URL` as `DATABASE_URL` for test workers, and `globalSetup` runs `prisma migrate deploy` in a child process whose environment overrides `DATABASE_URL` with the test URL. ⚠ If your Prisma version configures the URL in `prisma.config.ts`, make sure that file also reads the overridden variable.

---

## 4. Recommended project structure

```text
wayfarer/
├── client/
│   ├── public/places/            # 4–5 committed photos + CREDITS.md (optional)
│   ├── src/
│   │   ├── components/           # AppHeader, UserSwitcher, CategoryFilter, SortSelect,
│   │   │                         # PlaceCard, PlaceImage, RatingSummary, ReviewList, ReviewForm,
│   │   │                         # TourSlotList, StatusMessage
│   │   ├── context/              # CurrentUserContext.tsx
│   │   ├── hooks/                # useApi.ts (the only custom hook)
│   │   ├── pages/                # ExplorePage.tsx, PlaceDetailsPage.tsx
│   │   ├── services/             # api.ts (fetch wrapper + one function per endpoint)
│   │   ├── types/                # index.ts (API response types)
│   │   ├── App.tsx               # routes + provider
│   │   ├── index.css             # Tailwind import + theme tokens
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts            # React + Tailwind plugins, /api proxy
│   └── package.json
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/           # includes hand-edited CHECK constraints
│   │   └── seed.ts
│   ├── src/
│   │   ├── routes/               # users.ts, places.ts, slots.ts, health.ts, index.ts
│   │   ├── controllers/          # placeController.ts, reviewController.ts, bookingController.ts, userController.ts
│   │   ├── services/             # placeService.ts, reviewService.ts, bookingService.ts, userService.ts
│   │   ├── middleware/           # attachUser.ts, errorHandler.ts
│   │   ├── lib/                  # ranking.ts, validation.ts, errors.ts, prisma.ts, env.ts
│   │   ├── app.ts                # builds the Express app; does NOT listen
│   │   └── server.ts             # imports app and calls listen
│   ├── tests/
│   │   ├── unit/                 # ranking.test.ts, testDatabaseGuard.test.ts
│   │   ├── integration/          # booking.concurrency.test.ts, reviews.test.ts,
│   │   │                         # places.test.ts, identity.test.ts, schema.test.ts
│   │   ├── helpers/              # assertTestDatabase.ts, resetDatabase.ts, factories.ts, assertSlotConsistent.ts
│   │   └── globalSetup.ts        # migrate the TEST schema once
│   ├── vitest.config.ts
│   ├── .env.example
│   └── package.json
├── scripts/setup.mjs             # install, env file, generate, migrate, seed (cross-platform)
├── docs/PROJECT_GUIDE.md
├── package.json                  # npm workspaces + root scripts
├── .nvmrc  .gitignore
├── README.md  DECISIONS.md  AI_USAGE.md  DEVELOPMENT_PLAN.md
```

Notes:

- `app.ts` vs `server.ts` is required: Supertest needs the app without a listening port.
- Folders are created when their first file is created. No empty placeholder folders.
- Why `services/` exists even though the app is small: booking and review rules are real business logic (transactions, conflicts, upserts) and must be callable and testable without HTTP. Keep each service file small. If `userService.ts` is a three-line `findMany`, the controller may call Prisma through it anyway for consistency; do not create more layers than this.

---

## 5. Database model

PostgreSQL + Prisma. Use `Int` auto-increment ids (easy to read, easy to type into the header). Use `@@map`/`@map` for snake_case table and column names so raw SQL is unquoted and readable.

### 5.1 Entity relationship diagram

```mermaid
erDiagram
    USER ||--o{ REVIEW : writes
    USER ||--o{ BOOKING : makes
    PLACE ||--o{ REVIEW : receives
    PLACE ||--o{ TOUR_SLOT : offers
    TOUR_SLOT ||--o{ BOOKING : holds

    USER { int id PK
           string name }
    PLACE { int id PK
            string name
            string category
            string description
            string address
            string opening_hours
            string image_url }
    REVIEW { int id PK
             int place_id FK
             int user_id FK
             int rating
             string body
             timestamptz created_at
             timestamptz updated_at }
    TOUR_SLOT { int id PK
                int place_id FK
                timestamptz starts_at
                int capacity
                int booked_seats }
    BOOKING { int id PK
              int slot_id FK
              int user_id FK
              int seats
              timestamptz created_at }
```

### 5.2 Tables

**User** — `id` PK, `name` text. Seeded with fixed ids 1–3 so a stored `X-User-Id` survives re-seeding. No passwords.

**Place** — `id` PK; `name`; `category` (plain string, matched exactly; a Category table would add a join for nothing); `description`; `address` (the "location" shown on the details page); `openingHours` (free text, display only); `imageUrl` (relative path such as `/places/jeronimos-monastery.jpg`, nullable).
*Deviation from the suggested model:* `address` and `imageUrl` are additions required by the UI spec.

**Review** — `id` PK; `placeId` FK→Place; `userId` FK→User; `rating` int; `body` text; `createdAt`; `updatedAt` (`@updatedAt`).
*Deviation:* `updatedAt` added so an edited review shows it was edited.

**TourSlot** — `id` PK; `placeId` FK→Place; `startsAt` `timestamptz`; `capacity` int; `bookedSeats` int default 0.
*Deviation:* `bookedSeats` added (justified in 5.5).

**Booking** — `id` PK; `slotId` FK→TourSlot; `userId` FK→User; `seats` int; `createdAt`.

### 5.3 Constraints

| Constraint | Where | Purpose |
|---|---|---|
| `UNIQUE (place_id, user_id)` on Review (composite) | `schema.prisma` (`@@unique([placeId, userId])`) | **One review per user per place**, enforced by the database. The review `upsert` targets this constraint; the service never does find-then-write, and no application-level check is relied upon. |
| `CHECK (rating BETWEEN 1 AND 5)` | hand-edited migration | Invalid ratings can never be stored. |
| `CHECK (capacity > 0)` | hand-edited migration | Sanity. |
| `CHECK (booked_seats >= 0 AND booked_seats <= capacity)` | hand-edited migration | **Last line of defense against overbooking.** |
| `CHECK (seats > 0)` on Booking | hand-edited migration | Sanity. |
| Foreign keys | `schema.prisma` | Referential integrity. Keep Prisma's default `Restrict` delete behavior. |

Prisma cannot declare `CHECK` constraints in `schema.prisma`. Workflow: `prisma migrate dev --create-only --name add_checks`, append the `ALTER TABLE ... ADD CONSTRAINT ...` statements to the generated SQL by hand, then apply. Example shape (names are mandatory so errors are readable):

```sql
ALTER TABLE tour_slots
  ADD CONSTRAINT tour_slots_booked_within_capacity
  CHECK (booked_seats >= 0 AND booked_seats <= capacity);
```

⚠ A later `prisma db push` or `db pull` may drop or ignore hand-written checks. Use migrations only and say so in the README.

### 5.4 Indexes

| Index | Why |
|---|---|
| Review `UNIQUE (place_id, user_id)` | Also serves "reviews for a place" (leading column `place_id`). |
| TourSlot `(place_id, starts_at)` | Detail page loads a place's upcoming slots in order. |
| Booking `(slot_id)` | PostgreSQL does not index foreign keys automatically; the test and any reporting sum seats per slot. |
| Place `(category)` | Optional. Irrelevant at 10 rows; add only as a signal of intent and do not claim a speed-up. |

No other indexes.

### 5.5 Do we need `bookedSeats`?

| Approach | Safety mechanism | Cost |
|---|---|---|
| A. Derive seats from `SUM(bookings.seats)` | Lock the slot row (`SELECT ... FOR UPDATE`), sum, compare, insert | Three statements, raw SQL, lock must span all of them. |
| **B. Counter `bookedSeats` (chosen)** | One conditional `UPDATE` checks and reserves atomically | Denormalized: counter and Booking rows could drift. |

**Choice: B.** The check-and-reserve becomes a single statement that is easy to reason about and defend. Drift is controlled by: one code path writes both values; both writes happen in one transaction; the `CHECK` constraint; and the parallel test asserts `bookedSeats == SUM(booking.seats)`. A is documented as the rejected alternative (single source of truth, more moving parts).

#### Consistency invariant

For every slot, at all times: `booked_seats = SUM(bookings.seats)` and `0 <= booked_seats <= capacity`. Rules that keep it true:

1. The only code that changes `booked_seats` or inserts bookings is `bookingService.bookSeats` (and the seed, which builds both sides together). No other write path may exist.
2. The counter increment and the Booking insert happen in the **same PostgreSQL transaction**: both commit or neither does.
3. The increment is a conditional `UPDATE`, so the counter cannot pass capacity; the `CHECK` constraint is an independent backstop.
4. The app never updates or deletes bookings (no cancellation), so the sum and the counter can only grow together.
5. Verification: the shared test helper `assertSlotConsistent` runs after every booking test and after the seed check, and this read-only query must return zero rows:

```sql
SELECT s.id, s.booked_seats, COALESCE(SUM(b.seats), 0) AS booked_sum
FROM tour_slots s LEFT JOIN bookings b ON b.slot_id = s.id
GROUP BY s.id
HAVING s.booked_seats <> COALESCE(SUM(b.seats), 0);
```

### 5.6 Seed data specification (Lisbon)

The seed command (`npm run db:seed`) must be **idempotent**: it empties all tables with `TRUNCATE ... RESTART IDENTITY CASCADE`, then recreates everything. It uses fixed ids for users (1–3) and places, creates bookings through direct inserts that keep `bookedSeats` equal to the sum of bookings, and computes slot times **relative to the run time** (e.g. tomorrow 10:00 UTC, so data is never stale).

**Users:** 1 Ana, 2 Bruno, 3 Carla.

**Places and reviews** (reviewers in order Ana, Bruno, Carla; ratings below are the target data):

| # | Place | Category | Ratings | Tours |
|---|---|---|---|---|
| 1 | Jerónimos Monastery | History | 5, 5, 4 | yes |
| 2 | Belém Tower | History | 4, 3, 4 | no |
| 3 | Alfama | Neighbourhoods | 5, 4, 5 | yes (one almost full, one full) |
| 4 | National Tile Museum | Museums | 5, 4, 4 | yes |
| 5 | MAAT | Museums | 2, 3 | no |
| 6 | Miradouro da Senhora do Monte | Viewpoints | 4, 5, 5 | no |
| 7 | Miradouro de Santa Luzia | Viewpoints | 4, 4 | no |
| 8 | Time Out Market | Food & Drink | 3, 2, 3 | no |
| 9 | Pastelaria Brilho *(new, fictional)* | Food & Drink | 5 | no |
| 10 | Príncipe Real Garden | Neighbourhoods | *(none)* | no |

Total: 23 reviews, sum 92, global average **C = 4.000**. With `m = 10` the expected ranking (see Section 5.7) puts Brilho **4th, not 1st**; a plain average would put it first (tie at 5.0). This demonstrates the ranking fix with real data. **Synthetic data labelling (RV-8).** Place names are real; **every review is synthetic demonstration data** (short, varied, AI-generated text is fine). This is stated in four places: a header comment in `seed.ts` (and a line the seed prints when it finishes), a muted notice at the bottom of Explore, a muted line under the "Reviews" heading on Place Details, and the README. Pastelaria Brilho is a fictional venue. Descriptions are one or two sentences.

**Images:** `imageUrl` is set for only five places: Jerónimos Monastery, Belém Tower, Alfama, National Tile Museum and Miradouro da Senhora do Monte, and **only if** the photo file is actually committed. All other places have `imageUrl = null` and show the placeholder (Section 7.8).

**Tour slots** (all in the future; capacity 10 unless noted):

| Place | Slot | Capacity | Booked | Seats left |
|---|---|---|---|---|
| Jerónimos | tomorrow 10:00 | 10 | 3 | 7 |
| Jerónimos | day+2 14:00 | 8 | 0 | 8 |
| Alfama | tomorrow 16:00 | 10 | 8 | **2 (almost full)** |
| Alfama | day+2 10:00 | 6 | 6 | **0 (full)** |
| Tile Museum | day+1 11:00 | 12 | 2 | 10 |

Bookings backing the "booked" numbers use the seeded users (e.g. Alfama 8 = Ana 5 + Bruno 3).

### 5.7 Ranking reference values (hand-computed; assert them in tests, recompute with code)

| Place | v | R | Score (m=10, C=4.0) |
|---|---|---|---|
| Alfama, Jerónimos, Miradouro da Senhora do Monte | 3 | 4.667 | 4.154 |
| Pastelaria Brilho | 1 | 5.000 | 4.091 |
| National Tile Museum | 3 | 4.333 | 4.077 |
| Miradouro de Santa Luzia | 2 | 4.000 | 4.000 |
| Príncipe Real Garden | 0 | n/a | 4.000 |
| Belém Tower | 3 | 3.667 | 3.923 |
| MAAT | 2 | 2.500 | 3.750 |
| Time Out Market | 3 | 2.667 | 3.692 |

Ties are broken by review count (descending), then name (ascending), so the order is deterministic: Alfama, Jerónimos, Senhora do Monte, Brilho, Tile Museum, Santa Luzia, Príncipe Real, Belém, MAAT, Time Out Market.

### 5.8 Interpreting `m = 10` and the neutral prior

**Interpretation of `m`.** The score is `(v/(v+m))·R + (m/(v+m))·C`. Read it as: *every place starts with `m = 10` imaginary reviews at the global average `C`*, and real reviews gradually outvote them. A place needs **10 real reviews before its own average counts as much as the prior** (50/50). Own-average weight `v/(v+10)`:

| Real reviews `v` | 0 | 1 | 2 | 3 | 10 | 30 | 100 | 312 |
|---|---|---|---|---|---|---|---|---|
| Weight of the place's own average | 0% | 9% | 17% | 23% | 50% | 75% | 91% | 97% |

Consequences to state in `DECISIONS.md`: a single 5★ review carries ~9% weight; a place with 312 reviews is almost entirely judged on its own rating (the museum case); and because the 3 demo users cap live data at 3 reviews per place, every live score is dominated by the prior (own weight ≤ 23%), which is why the large-count case is proven in the unit test. `m = 10` is a judgment call, not a derived value.

**Neutral prior when no reviews exist.** Two cases, both defined explicitly (constant `NEUTRAL_PRIOR_RATING = 3.0`, the midpoint of the 1–5 scale):

1. *A place has no reviews, but other reviews exist:* its score is exactly the global average `C` (own weight is 0%). It displays "No reviews yet".
2. *No reviews exist anywhere:* `C` itself is undefined, so `C = NEUTRAL_PRIOR_RATING = 3.0`. All places score 3.0 and the deterministic tie-break orders them by name.

Known limitation: when only a handful of reviews exist overall, `C` itself is noisy. Blending `C` with the neutral prior (`C = (sum + k·3.0)/(n + k)`) would fix that, but it adds a second parameter for no benefit at this scale, so it is documented as rejected.

---

## 6. API contracts

All routes are under `/api`; JSON in and out. Ids in URLs are positive integers.

### 6.1 Conventions

**Acting-as header.** `X-User-Id: <integer>`.

- `attachUser` middleware (global): header absent → continue with no user; header present but not a positive integer or no such user → **401 `INVALID_USER`**; otherwise set `req.user`.
- `requireUser` (on writes): no user → **401 `USER_REQUIRED`**.
- Read endpoints work without the header; `myReview` is `null` when no user is acting.
- ⚠ Typing `req.user` in Express+TypeScript needs a small declaration merge (or use `res.locals.user`). Pick one and stay consistent.

**Error shape (every error):**

```json
{ "error": { "code": "SLOT_FULL", "message": "This tour is fully booked.", "details": { "seatsLeft": 0 } } }
```

`details` is optional. The UI switches on `code`, never on message text.

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad id, bad rating/body/seats, bad `sort` |
| 401 | `USER_REQUIRED` | Write without `X-User-Id` |
| 401 | `INVALID_USER` | Header present but not a seeded user |
| 404 | `NOT_FOUND` | Place or slot does not exist; unknown `/api/*` route |
| 409 | `SLOT_FULL` | Slot has 0 seats left |
| 409 | `NOT_ENOUGH_SEATS` | Some seats left, but fewer than requested (`details.seatsLeft`) |
| 500 | `INTERNAL_ERROR` | Anything unexpected (no stack trace in the response) |

**Decision:** 409 for capacity conflicts because the request is valid but conflicts with current state.

### 6.2 Endpoint summary

| Method | Path | Headers | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Liveness plus DB check |
| GET | `/api/users` | — | Users for the switcher |
| GET | `/api/categories` | — | Distinct categories for the filter |
| GET | `/api/places?category=&sort=` | optional | Backend-filtered, backend-sorted list |
| GET | `/api/places/:id` | optional | Place + reviews + tour slots + `myReview` |
| PUT | `/api/places/:id/review` | **required** | Create or update the acting user's review |
| POST | `/api/slots/:slotId/bookings` | **required** | Book seats atomically |

**Consolidation vs the candidate list:** `GET /places/:id/reviews` and `GET /places/:id/tour-slots` are folded into `GET /places/:id` (the page always needs all three, so one request means one loading state and one refetch after any action). `POST /places/:id/reviews` becomes `PUT /places/:id/review`: "one review per user per place" makes the review a single resource per (user, place), and `PUT` is naturally idempotent. The booking path is `/slots/:slotId/bookings` (not `/tour-slots/...`) to keep URLs short; the model is still called TourSlot.

### 6.3 Endpoint details

**`GET /api/health`** → `200 { "status": "ok", "database": "up" }` (runs `SELECT 1`). If the DB is down → `503 { "status": "error", "database": "down" }`.

**`GET /api/users`** → `200`

```json
{ "users": [ { "id": 1, "name": "Ana" }, { "id": 2, "name": "Bruno" }, { "id": 3, "name": "Carla" } ] }
```

**`GET /api/categories`** → `200 { "categories": ["Food & Drink", "History", "Museums", "Neighbourhoods", "Viewpoints"] }` (sorted alphabetically).

**`GET /api/places`**
Query: `category` (optional, exact match, empty means all), `sort` (`top` default, or `name`).
Unknown `sort` → 400. Unknown category → `200` with an empty list.

```json
{
  "places": [
    {
      "id": 3, "name": "Alfama", "category": "Neighbourhoods",
      "description": "Lisbon's oldest quarter...", "imageUrl": "/places/alfama.jpg",
      "reviewCount": 3, "averageRating": 4.67, "score": 4.1538
    }
  ]
}
```

`averageRating` is `null` when `reviewCount` is 0. `score` is the Bayesian score (full precision; round only for display, and the UI does not show it). Sorting `top`: score desc, review count desc, name asc. Sorting `name`: name asc.

**`GET /api/places/:id`** → `200`

```json
{
  "place": {
    "id": 3, "name": "Alfama", "category": "Neighbourhoods", "description": "...",
    "address": "Alfama, 1100 Lisboa", "openingHours": "Open all day", "imageUrl": "/places/alfama.jpg",
    "reviewCount": 3, "averageRating": 4.67
  },
  "reviews": [
    { "id": 9, "rating": 5, "body": "Got lost, loved it.", "createdAt": "2026-11-03T10:00:00.000Z",
      "updatedAt": "2026-11-03T10:00:00.000Z", "user": { "id": 1, "name": "Ana" } }
  ],
  "tourSlots": [
    { "id": 12, "startsAt": "2026-11-04T16:00:00.000Z", "capacity": 10, "seatsLeft": 2 }
  ],
  "myReview": { "rating": 5, "body": "Got lost, loved it." }
}
```

Reviews are newest first. `tourSlots` are ordered by `startsAt` and empty (`[]`) for places without tours. `myReview` is `null` if the acting user has not reviewed this place or no user is acting. Errors: 400 invalid id, 404 unknown place.

**`PUT /api/places/:id/review`** (requires `X-User-Id`)
Body: `{ "rating": 4, "body": "Lovely, but crowded after 11." }`
Validation: `rating` an integer 1–5 (numbers only, no numeric strings); `body` a string whose trimmed length is 1–500.
Response `200 { "review": { "id": 9, "rating": 4, "body": "...", "createdAt": "...", "updatedAt": "..." } }` for both create and update. Errors: 400, 401, 404.

**`POST /api/slots/:slotId/bookings`** (requires `X-User-Id`)
Body: `{ "seats": 2 }` (integer 1–10). The maximum is enforced by the **backend** (`MAX_SEATS_PER_BOOKING = 10`), independent of the UI: `11`, `0`, `-1`, `1.5`, `"2"` and a missing value all return `400 VALIDATION_ERROR` (with `details.maxSeats: 10` for the too-large case) before any database work happens.
Response `201`:

```json
{
  "booking": { "id": 31, "slotId": 12, "seats": 2, "createdAt": "2026-11-03T10:05:00.000Z" },
  "slot": { "id": 12, "capacity": 10, "seatsLeft": 0 }
}
```

Errors: 400 (invalid `seats` or id), 401, 404 (unknown slot), 409 `SLOT_FULL` / `NOT_ENOUGH_SEATS` (with `details.seatsLeft`).

### 6.4 Where the response fields come from

- `averageRating`, `reviewCount`: from Prisma aggregates over reviews (computed on read; there is no stored rating).
- `seatsLeft`: `capacity - bookedSeats`.
- `score`: `lib/ranking.ts` given `v`, `R`, the global average `C`, and the prior weight `m`.

---

## 7. UI/UX design specification

**Identity:** a warm, dark, travel-journal feel. Think "evening in a Lisbon café", not "analytics dashboard". Photography leads; chrome stays quiet; one terracotta accent does the work.

### 7.1 Colour tokens (dark only)

Define these once as CSS variables / Tailwind theme tokens (⚠ Tailwind v4: `@theme` in `index.css`; v3: `theme.extend.colors`). Use token names in components, never raw hex.

| Token | Hex | Used for |
|---|---|---|
| `bg` | `#161311` | Page background |
| `bg-alt` | `#1D1916` | Header band, section backgrounds |
| `surface` | `#25201C` | Cards, panels, inputs |
| `surface-raised` | `#302A25` | Hover, selected chip, dropdown |
| `text` | `#F3EBDD` | Primary text, headings |
| `text-secondary` | `#C9BDAA` | Descriptions, review bodies |
| `text-muted` | `#8F8374` | Metadata, placeholders, review counts |
| `accent` | `#D9694A` | Primary buttons, links, focus ring, rating stars |
| `accent-hover` | `#E27B5E` | Button hover |
| `on-accent` | `#161311` | Text on accent buttons |
| `sage` | `#9BAE7F` | Category labels, "seats left", positive emphasis |
| `border` | `#3A332C` | Card/input borders, dividers |
| `success` | `#9BAE7F` (same as `sage`) | Confirmation text, success border |
| `error` | `#E5707E` | Error text and borders (always paired with an icon/word, never colour alone) |

Rules: no gradients, no glow, no additional hues. Body text must reach **≥ 4.5:1** contrast against its background; the combinations above are chosen to meet that, but ⚠ verify each pairing with a contrast checker before finishing Slice 5 (especially `text-muted` on `surface`, and `on-accent` on `accent`; adjust lightness, not hue, if one fails). Keep a visible focus ring (`accent`, 2px, offset) on every interactive element.

### 7.2 Typography

One family: **Figtree** (variable; friendly geometric sans with warmth), falling back to `system-ui, sans-serif`. ⚠ If the font package causes trouble, use the system stack and move on.

| Role | Size / weight | Colour | Notes |
|---|---|---|---|
| Page heading (H1) | 28–30 px / 600 | `text` | One per page, compact |
| Section heading (H2) | 20 px / 600 | `text` | "Reviews", "Guided tours" |
| Place name (card) | 18 px / 600 | `text` | |
| Place name (details H1) | 30 px / 600 | `text` | |
| Body | 16 px / 400, line-height 1.6 | `text-secondary` | |
| Metadata (category, count, time) | 13–14 px / 500 | `text-muted` or `sage` | Category as small uppercase label with letter-spacing |
| Buttons, labels | 14 px / 600 | `on-accent` / `text` | |

No decorative typefaces, no oversized headings below the page title.

### 7.3 Layout rules

- Content container: `max-w-6xl`, centered, horizontal padding 16 px (mobile) / 24 px (desktop).
- Spacing scale: 4/8/12/16/24/32/48 only.
- Corner radius: **6 px** on cards, buttons and inputs; no pill shapes. Chips are rectangular with the same radius.
- Elevation: borders instead of shadows. At most one subtle shadow on the dropdown.
- No glassmorphism, no animations beyond colour transitions on hover/focus (≤150 ms). Loading placeholders are static blocks, not pulsing.
- Responsive: grid 3 columns ≥1024 px, 2 columns ≥640 px, 1 column below. Detail page: two columns ≥1024 px, stacked below. Basic responsiveness is just these Tailwind breakpoints; do not spend extra time on mobile polish.

### 7.4 Navigation and screens

```mermaid
flowchart LR
    E["Explore  /"] -- "click a place" --> D["Place Details  /places/:id"]
    D -- "← Back to Explore" --> E
```

Routes: `/` and `/places/:id`. Unknown route → a small "Page not found" message with a link home (not a third screen). Invalid place id → the details page shows the not-found error state.

**Header (both screens):** left, the "Wayfarer" wordmark (text only, a terracotta accent on one character or a small inline SVG mark; no logo image). Right, the **"Acting as"** select (label plus native `<select>` styled with tokens). Changing user: store in `localStorage`, update the API wrapper, and **refetch the current screen** so `myReview` updates.

### 7.5 Screen 1 — Explore

Top to bottom:

1. **Compact heading band:** H1 "Explore Lisbon", one line beneath: "Honest ratings, fair bookings." No hero image.
2. **Controls row:** category filter (buttons: "All" plus one per category from `/api/categories`, the selected one filled with `surface-raised` and an `accent` underline) on the left; **sort select** ("Top rated" / "Name A–Z") on the right. Beneath the sort control, when "Top rated" is active, a one-line muted hint: "Ranked with review count in mind, so one 5★ review doesn't beat a well-reviewed favourite." This explains why a 5.0 can rank below a 4.7.
3. **Grid of place cards.**
4. **Data notice** (small muted line at the bottom of the page): "Reviews in this demo are synthetic demonstration data."

**Place card** (whole card is a link): image or placeholder on top (3:2, `object-cover`, 1 px border); below it: category label (`sage`, uppercase 12 px), place name, a two-line clamped description, and a rating row: `★ 4.7 · 3 reviews`. The review count is always visible. If there are no reviews: "No reviews yet" in `text-muted`. Hover: border becomes `accent`; no movement.

**States:**

| State | Presentation |
|---|---|
| Loading | Static skeleton cards (same grid, `surface` blocks) plus visually hidden "Loading places…" text |
| Empty (category has no places) | "Nothing here yet." with a "Show all places" button |
| Error | Inline panel with `error` border: "We couldn't load places." + the server's message if safe + **Try again** button |

### 7.6 Screen 2 — Place Details

Two columns on desktop (left ~2/3 main content, right ~1/3 sticky booking panel); for places **without** tours the right column is omitted and the main column stays a readable width. No empty "tours" section is shown.

**Left column (top to bottom):**

1. `← Back to Explore` text link.
2. Hero image (max height ~320 px, `object-cover`) or, when the place has no photo, the short placeholder band from Section 7.8.
3. Category label, place name (H1), address and opening hours in muted metadata, rating summary (`★ 4.7` large, "based on 3 reviews" muted).
4. Description paragraph.
5. **Reviews** (H2), with a muted line beneath it: "All reviews are synthetic demonstration data." Then the **review form first** ("Your review" if the user has one, otherwise "Write a review") followed by the list of reviews (user name, ★ rating, date, text; the acting user's own review is marked "You").
   - Form: 5 star radio buttons (large hit areas, keyboard accessible), textarea (max 500 with a live counter), submit button: **"Post review"** or **"Update review"** if `myReview` exists. Pre-filled from `myReview`. Saving shows an inline success line ("Review saved") and refreshes the list and rating summary. Validation errors appear beside the field.

**Right column — Guided tours panel** (only if `tourSlots.length > 0`):

For each slot, a compact row: formatted date/time (`Wed 4 Nov · 16:00`, via `Intl.DateTimeFormat` in the browser), seats-left text, seat selector, **Book** button.

| Slot state | Seats text | Controls |
|---|---|---|
| Plenty (>3 left) | "7 seats left" (`sage`) | Seat `<select>` 1…min(seatsLeft, 10); Book enabled |
| Few (1–3 left) | "Only 2 seats left" (`text`, with `accent` emphasis) | Same |
| Full (0 left) | "Fully booked" (`text-muted`) | Select hidden, button replaced by a disabled "Full" label |

**Booking feedback (inline in the row, never `alert()`):**

| Event | Message |
|---|---|
| In progress | Button shows "Booking…" and is disabled (also prevents double-clicks) |
| Success | Green-bordered confirmation: "Booked! 2 seats on Wed 4 Nov at 16:00." and the seats-left text updates immediately from the response |
| 409 `SLOT_FULL` | "Sorry, this tour just filled up. Someone booked the last seat before you." The row refetches and shows "Fully booked" |
| 409 `NOT_ENOUGH_SEATS` | "Only N seats are left now. Pick a smaller group." The select resets to the new maximum |
| 401 / network / 500 | "Couldn't complete your booking. Please try again." |

**Page states:** loading (skeleton for hero + text blocks), error with **Try again**, not-found ("We couldn't find that place" + link back).

### 7.7 Interface copy

Natural, concise, no marketing filler. Good: "Fully booked", "Review saved", "Only 2 seats left". Avoid: "Unlock the magic of Lisbon!", "Oops! Something went wrong 😱".

### 7.8 Photography and placeholders

Image sourcing must never delay implementation. Policy:

- **At most 5 photos**, for Jerónimos Monastery, Belém Tower, Alfama, National Tile Museum and Miradouro da Senhora do Monte. Fewer is fine; zero is acceptable.
- **Time-box: 10 minutes total, at the very end of Slice 5, and only if both critical-path checkpoints are green** (Section 12). If it isn't done in 10 minutes, ship placeholders and move on.
- Use only images whose licence clearly allows reuse (e.g. Wikimedia Commons or Unsplash). For each committed file, record author, source URL and licence in `client/public/places/CREDITS.md`. **If you can't record those quickly, don't commit the image.**
- Files: `client/public/places/<slug>.jpg`, about 1200×800, under ~200 KB. The assistant that wrote this plan cannot download images; you gather them.
- The seed sets `imageUrl` only for places whose file is committed; all others are `null`.

**The placeholder is a designed state, not a fallback error.** One `PlaceImage` component renders both the photo and the placeholder so cards and the details page behave identically:

- Same aspect ratio as photos on cards (so a grid mixing photos and placeholders stays aligned): `surface-raised` background, 1 px `border`, the category label centered in `sage` small caps. No icons or illustrations.
- On the details page, a place without a photo shows a short placeholder band (~120 px tall, not a big empty hero) so the description and booking panel stay above the fold.
- `onError` on an `<img>` switches to the same placeholder, so a missing or broken file never shows a broken-image icon. Alt text is the place name.

---

## 8. Vertical-slice implementation plan

Order is by dependency and risk. Booking safety and ranking come before polish.

```mermaid
flowchart LR
    S0[0 Foundation] --> S1[1 DB + Seed]
    S1 --> S2[2 Discovery + Ranking]
    S1 --> S3[3 Details + Reviews]
    S2 --> S3
    S3 --> S4[4 Tours + Safe Booking]
    S4 --> S5[5 Integration + UX]
    S5 --> S6[6 Verification + Docs]
```

| Slice | Time | Main risk addressed |
|---|---|---|
| 0 Foundation | 25 min | Tooling/Prisma/Postgres connection |
| 1 Database + seed + safe test setup | 45 min | Constraints, idempotent seed, `TEST_DATABASE_URL` guard |
| 2 Discovery + ranking | 55 min | **Ranking correctness (required test #1)**; backend plumbing |
| 3 Details + reviews (identity first) | 40 min | Upsert + uniqueness, identity |
| 4 Tours + booking (4a backend + test, then 4b UI) | 60 min | **Concurrency (required test #2)** |
| 5 Integration + UX | 20 min | States; photos last and optional |
| 6 Verification + docs | 25 min | Fresh clone, quality gates, docs |
| **Total** | **270 min = 4.5 h** | |

> **Critical-path rule:** Slice 4a (booking backend + parallel test) depends only on Slice 1, the plumbing commits from Slice 2 and the identity-middleware commit that opens Slice 3. If Slice 3 is behind at the 2:30 mark, stop it at the next green commit, do Slice 4a, and finish Slice 3's UI afterwards. Never skip 4a; trim UI instead.

---

### Slice 0 — Project foundation

**1. Objective.** A skeleton where `npm run dev` shows a React page that calls `GET /api/health` and prints the result.

**2. User value.** None directly; unblocks everything and proves the toolchain.

**3. Prerequisites.** Node LTS, local PostgreSQL 18 service, Git.

**4. Database.** Locally installed PostgreSQL 18:
- Two dedicated databases: `wayfarer` (development) and `wayfarer_test` (automated tests).
- Configured via environment variables (`DATABASE_URL` and `TEST_DATABASE_URL`). Docker is not used.

**5. Backend tasks.**
- Root `package.json` with npm workspaces (`client`, `server`) and scripts: `setup`, `dev` (`concurrently` runs both), `test` (server Vitest suite), `typecheck` (server `tsc --noEmit` plus client `tsc -b`; ⚠ verify against the Vite template's tsconfig layout), `build` (client production build), **`verify`** (`typecheck`, then `build`, then `test`), `db:seed`, `db:migrate`.
- `server`: TypeScript, `tsx watch src/server.ts`, `app.ts` (JSON body parser and `/api` router; `notFound` and `errorHandler` arrive in Slice 2) separate from `server.ts` (listen on `PORT`, default 3001). `lib/env.ts` loads `server/.env` via `dotenv` and validates that `DATABASE_URL` exists (fail fast with a readable message).
- `lib/prisma.ts` exports the single `PrismaClient`.
- `GET /api/health` runs `SELECT 1`.
- `.env.example` (placeholders only): `DATABASE_URL` (e.g. `postgresql://postgres:password@localhost:5432/wayfarer`), `TEST_DATABASE_URL` (e.g. `postgresql://postgres:password@localhost:5432/wayfarer_test`; see Section 9.2), `PORT`. `.gitignore` excludes `.env`, `node_modules`, `dist`, build output.
- `scripts/setup.mjs` (cross-platform Node script): copy `.env.example` to `.env` if missing; run `prisma generate`; `prisma migrate deploy`; run the seed. The root `setup` script is `npm install && node scripts/setup.mjs`.

**6. API.** `GET /api/health` per Section 6.3.

**7. Frontend.** Vite + React + TS template; Tailwind installed and the token file started (`index.css`); `/api` proxy to `http://localhost:3001` in `vite.config.ts`; `App.tsx` calls `/api/health` and shows "API: ok". Remove template boilerplate.

**8. Edge cases.** Missing `DATABASE_URL`; Postgres not running (health returns 503 with a clear message); port already in use.

**9. Tests.** None yet (one smoke test for `/api/health` is optional and can wait for Slice 1 when the test database exists).

**10. Manual verification.**
- Local PostgreSQL service is running and `wayfarer` database is reachable.
- `npm run dev`: browser shows "API: ok"; `curl localhost:3001/api/health` returns `{status:"ok",...}`.
- Stop Postgres: the UI shows an error state, not a blank page.

**11. Acceptance criteria.** Toolchain works end to end; `git status` shows no secrets or `node_modules`; README skeleton has the setup commands (even if the seed doesn't exist yet); `npm run typecheck` and `npm run build` succeed on the skeleton.

**12. Deliverables.** Root/server/client skeletons, `.env.example`, `.gitignore`, `.nvmrc`, `scripts/setup.mjs`, minimal `README.md`, empty-ish `DECISIONS.md` and `AI_USAGE.md` (start taking notes now), this plan.

**13. Commits (suggested).**
- `chore: initialize monorepo with npm workspaces`
- `feat: scaffold Express app with health endpoint`
- `chore: scaffold React client with Tailwind and API proxy`
- `docs: add README skeleton and setup script`

**14. Estimate.** 25 minutes. Do not polish; Prisma/Postgres connection surprises are likely here.

---

### Slice 1 — Database and seed data

**1. Objective.** The full schema with constraints, migrations, an idempotent Lisbon seed, and a separate **test schema**.

**2. User value.** Real data to browse in every later slice.

**3. Prerequisites.** Slice 0.

**4. Database.** Models and constraints exactly as Section 5. Steps:
1. Write `schema.prisma` (snake_case `@@map`/`@map`, `@db.Timestamptz` on `startsAt`/`createdAt`/`updatedAt`; ⚠ verify the native-type attribute).
2. `prisma migrate dev --name init`.
3. `prisma migrate dev --create-only --name add_checks`, hand-add the four `CHECK` constraints, apply.

**5. Backend tasks.**
- `prisma/seed.ts` per Section 5.6; `package.json` `prisma.seed` or a `db:seed` script that runs it via `tsx`. It truncates all tables with `RESTART IDENTITY CASCADE`, inserts users, places, reviews, slots, and bookings so that `bookedSeats` equals the sum of its bookings. The file starts with a comment stating that all reviews are synthetic demonstration data, and the script prints that label when it finishes. The seed only ever uses `DATABASE_URL`; it never reads `TEST_DATABASE_URL`.
- Test environment (needed for Slice 2+), following the **test database safety rules in Section 9.2**:
  - `.env.example` ships `TEST_DATABASE_URL` pointing to the dedicated local test database `wayfarer_test` (e.g. `postgresql://postgres:password@localhost:5432/wayfarer_test`). It is **required**; there is no default and no fallback to `DATABASE_URL`.
  - `tests/helpers/assertTestDatabase.ts`: a small pure function that throws a readable error when the test URL is missing, empty, unparsable, equal to the dev URL, or not clearly a test target (database name must be `wayfarer_test` or contain `test`). `vitest.config.ts` calls it at load time, **before any database connection is attempted**, and then injects the test URL as `DATABASE_URL` for test workers.
  - `tests/globalSetup.ts` runs `prisma migrate deploy` against the test database `wayfarer_test` only.
  - `tests/helpers/resetDatabase.ts` truncates all tables, after re-checking at runtime (`SELECT current_database()`) that it is connected to `wayfarer_test`.
  - Two dedicated local databases are used: `wayfarer` for development and `wayfarer_test` for automated tests.
- Configure Vitest to run test files **serially** (⚠ `fileParallelism: false`), because tests truncate shared tables.

**6. API.** None new.

**7. Frontend.** None.

**8. Edge cases.** Seed run twice → same counts; seed against a database without migrations → clear failure; user ids stable.

**9. Tests.**
- **Unit (no DB), `testDatabaseGuard.test.ts`:** the guard rejects a missing value, an empty value, a value equal to `DATABASE_URL`, a URL pointing to the dev database `wayfarer`, and a URL with no test marker; it accepts the `wayfarer_test` example.
- **Integration (real PostgreSQL), `schema.test.ts`** (3–5 tiny tests): inserting a rating of 0 or 6 fails; a duplicate `(place_id, user_id)` review fails on the **composite unique constraint** (this is the database-level uniqueness guarantee for RV-2); `booked_seats > capacity` fails; `seats = 0` fails. These prove the database is the last line of defense.

**10. Manual verification.**
- `npm run db:seed` twice; query counts: 3 users, 10 places, 23 reviews, 5 slots.
- Confirm Alfama slot 1 has 2 seats left and slot 2 is full.
- `\d tour_slots` in `psql` shows the check constraint.
- Unset `TEST_DATABASE_URL` and run `npm test`: it fails immediately with a clear message and no table is touched. Set it equal to `DATABASE_URL`: same result.
- Run the consistency query from Section 5.5: zero rows.

**11. Acceptance criteria.** Migrations apply from scratch; seed is idempotent and matches Section 5.6; sum of `booking.seats` equals `booked_seats` for every slot; the test database `wayfarer_test` works; `npm test` refuses to run (before touching any database) when `TEST_DATABASE_URL` is missing, equals the dev URL or isn't a clear test target; the consistency query returns zero rows.

**12. Deliverables.** `schema.prisma`, migrations (including checks), `seed.ts`, test config/helpers, `schema.test.ts`, first section of `docs/PROJECT_GUIDE.md` (models, migrations, seed).

**13. Commits.**
- `feat: add Prisma schema for places, reviews, tours and bookings`
- `feat: add check constraints for ratings, capacity and seats`
- `feat: add idempotent Lisbon seed script`
- `feat: require explicit TEST_DATABASE_URL with a safety guard`
- `test: add test database setup, guard and constraint tests`
- `docs: document schema and seed in project guide`

**14. Estimate.** 45 minutes.

---

### Slice 2 — Place discovery (includes required ranking test)

**1. Objective.** The Explore screen backed by `GET /api/places` with backend filtering and weighted sorting.

**2. User value.** Travellers see a fair ordering with review counts, and filter by category.

**3. Prerequisites.** Slice 1.

**4. Database.** Reads `Place` and `Review`; no schema change.

**5. Backend tasks.**
- **Shared plumbing first** (the places endpoint needs 400/404 responses, and Slice 4 depends on it): `lib/errors.ts` (an `AppError` base with status, code, message, optional details, plus small helpers: validation, unauthorized, not found, slot full, not enough seats); `middleware/errorHandler.ts` (known `AppError` → standard JSON; anything else → logged, then a generic 500 with no stack trace) and `notFound` for unknown `/api/*` routes; `lib/validation.ts` starting with `parseId` and `parseSort` (hand-written, no Zod).
- `lib/ranking.ts` — **pure, no imports from Prisma**:
  - constants `PRIOR_WEIGHT = 10` (m) and `NEUTRAL_PRIOR_RATING = 3.0` (used as `C` only when no review exists anywhere; Section 5.8);
  - a function computing the score from `reviewCount`, `averageRating`, `globalAverage`, `priorWeight` (zero reviews returns the global average);
  - a comparator: score desc, review count desc, name asc.
- `placeService.listPlaces({ category, sort })`: (1) one `groupBy` on reviews for per-place count and average, (2) one aggregate for the global average (fallback constant when there are no reviews), (3) fetch places with the optional category filter, (4) attach stats and score, (5) sort for `top` (comparator) or `name`.
- `placeController`: validate `sort ∈ {top, name}` and trim `category`; `listCategories` for `/api/categories` (distinct, sorted).
- **Decision:** compute the global average over **all** reviews, not only those in the filtered category, so a place's score does not change when you filter. Record in `DECISIONS.md`.
- **Decision:** sort in application code after fetching. The requirement is "backend", not "SQL"; at this size it's simpler and unit-testable. Mention the SQL alternative for large data.
- Ranking formula and edge cases go into `DECISIONS.md` now (formula, variables, why `m = 10` and how to read it (a place needs 10 reviews before its own average counts as much as the prior), the neutral prior for empty data, example table from Section 5.7, where it breaks: cold start, `m` is a judgment call, global average shifts, the 3-user cap).

**6. API.** `GET /api/categories`, `GET /api/places` per Section 6.3.

**7. Frontend.**
- `services/api.ts`: `request()` wrapper that sets `Content-Type`, adds `X-User-Id` when a user is selected, parses `{error}` bodies into an `ApiError` with `code` and `message`; functions `getPlaces`, `getCategories`.
- `hooks/useApi.ts`: tiny hook returning `{ data, error, loading, reload }` for a fetcher + dependency list. This is the only custom hook; it is justified because four fetches share identical loading/error handling. Guard against stale responses (ignore a result if the dependencies changed).
- `components/`: `AppHeader` (user switcher stubbed until Slice 3), `CategoryFilter`, `SortSelect`, `PlaceCard`, `StatusMessage` (loading / empty / error variants).
- `pages/ExplorePage.tsx`: holds `category` and `sort` in component state (optionally in the URL query string, which is cheap with React Router and gives shareable URLs), calls `getPlaces`, renders states. **No sorting or filtering in the browser.** It also renders the small synthetic-data notice from Section 7.5.

**8. Edge cases.** No reviews in the database (all scores equal the fallback; sorted by name); category with no places; invalid `sort` → 400 (UI never sends one); API down → error state with retry; slow response while changing filters (ignore the stale one).

**9. Tests.**
- **Unit (no DB), `tests/unit/ranking.test.ts` — REQUIRED:**
  1. 1 review at 5.0 scores **below** 312 reviews at 4.7 (the headline bug, with `C = 4.0`).
  2. Hand-computed exact value (`v=1, R=5, C=4, m=10` → 4.0909…) with `toBeCloseTo`.
  3. Zero reviews → exactly `C`.
  4. Convergence: 10,000 reviews at 4.5 is within 0.01 of 4.5.
  5. Direction: above-`C` averages gain from more reviews, below-`C` averages lose.
  6. Bounds: the score stays within [1, 5] for extreme inputs.
  7. Comparator: ties resolved by count then name, deterministic.
  8. Neutral prior: with no reviews anywhere, `C` is exactly `3.0` and every place scores 3.0; a zero-review place in a non-empty dataset scores exactly the global average.
- **Integration (real DB), `places.test.ts`:** category filter returns only that category; unknown category → `[]`; `sort=top` puts Pastelaria Brilho **not first** with the seeded data and the order equals Section 5.7; `sort=name` is alphabetical; `sort=banana` → 400; `/api/categories` returns the five categories; with all reviews deleted, every place scores 3.0 and the list is ordered by name (RV-7).

**10. Manual verification.** Open Explore: Alfama/Jerónimos/Senhora do Monte first, Brilho fourth with "1 review"; filter "Museums" shows two places; refresh keeps behavior; stop the server and confirm the error state and retry.

**11. Acceptance criteria.** PL-4/5/6, RV-4/5/6/7 satisfied; network tab shows `?category=` and `?sort=` query strings (filtering truly happens on the server); ranking test passes.

**12. Deliverables.** `ranking.ts`, `placeService.ts`, controllers/routes, client list UI, tests, ranking section of `DECISIONS.md`, guide sections on filtering/sorting/ranking.

**13. Commits.**
- `feat: implement weighted ranking calculation`
- `test: add unit tests for ranking edge cases`
- `feat: add typed application errors, validation helpers and error handler`
- `feat: add places list endpoint with category filter and top-rated sort`
- `test: verify backend filtering and sorting against seeded data`
- `feat: build Explore page with filters, sorting and states`
- `docs: explain ranking formula in DECISIONS.md`

**14. Estimate.** 55 minutes. Commit the ranking function and its test **first**, before the plumbing and before touching the UI. **Checkpoint C1 (Section 12):** ranking test green and committed.

---

### Slice 3 — Place details and reviews (includes identity)

**1. Objective.** The Place Details screen with reviews and the review form, plus the working acting-as mechanism.

**2. User value.** Travellers can read reviews, post one, and edit their own.

**3. Prerequisites.** Slices 1–2.

**4. Database.** Uses the `Review` unique constraint `(place_id, user_id)`.

**5. Backend tasks.**
- **Task 3.1 — do this first and commit it** (it unlocks Slice 4a): `middleware/attachUser.ts` and `requireUser` (Section 6.1) and `GET /api/users`.
- Extend the Slice 2 plumbing: add `parseRating` and `parseReviewBody` to `lib/validation.ts` (`parseSeats` and `MAX_SEATS_PER_BOOKING` arrive in Slice 4). Error classes and the error handler already exist.
- `placeService.getPlaceDetails(placeId, userId?)`: place with count/average, reviews (newest first, with user), upcoming slots with `seatsLeft`, and `myReview`.
- `reviewService.saveReview(userId, placeId, { rating, body })`: confirm place exists (404) then a single `upsert` keyed on the composite unique constraint `(placeId, userId)` (never find-then-write; the database constraint, not an application check, guarantees RV-2). ⚠ verify whether Prisma issues a native `INSERT ... ON CONFLICT` for your version and conditions; if it falls back to find-then-write, catch the unique-violation error (`P2002`) once and retry as an update. The unique constraint protects integrity either way. Record the finding in `DECISIONS.md`.

**6. API.** `GET /api/users`, `GET /api/places/:id`, `PUT /api/places/:id/review` per Section 6.3.

**7. Frontend.**
- `context/CurrentUserContext.tsx`: loads users, restores the stored id from `localStorage` if still valid (else the first user), exposes `{ user, users, setUser }`, and tells `api.ts` which id to send. **Render pages only after the user is resolved** to avoid a first request without a header. Changing the user triggers the current page to refetch (keying the page content on the user id is the simplest way).
- `UserSwitcher` in `AppHeader`.
- `pages/PlaceDetailsPage.tsx`: reads `:id`, uses `useApi(getPlace)`, composes `RatingSummary`, `ReviewForm`, `ReviewList`. After saving, `reload()`.
- `components/ReviewForm.tsx` per Section 7.6, with client-side validation mirroring the server rules (the server stays authoritative). The Reviews section shows the synthetic-data line from Section 7.6.

**8. Edge cases.**
- Rating or text missing/invalid → 400, message beside the field.
- Same user submits twice → one row, updated.
- Two tabs submit the first review simultaneously → unique constraint stops duplicates (see the ⚠ above).
- Header missing on write → 401; unknown user id → 401; non-numeric place id → 400; unknown place → 404.
- Switching users: the form changes to that user's own review (or empty).
- Place without tours: no tours panel (Slice 4 adds the panel; for now render nothing).

**9. Tests (integration, real DB; Supertest against `app`).**
- First review → `200`, count 1; second submission by the same user → same review id, new body, **count still 1**.
- Rating 0, 6, 3.5, `"5"`, missing → 400. Empty/whitespace body, 501-character body → 400.
- No header → 401 `USER_REQUIRED`; header `999` or `abc` → 401 `INVALID_USER`.
- Unknown place → 404.
- `GET /api/places/:id` returns `myReview` for the acting user and `null` for another; `reviews` are newest first.
- (Already covered in Slice 1) database unique constraint rejects direct duplicates.

**10. Manual verification.** Explore → open a place → switch Ana/Bruno/Carla and see their own review prefilled (or empty); submit a new review as Bruno; edit it; confirm the list shows one Bruno review; confirm the average and count change; try invalid input; stop the API and see the error.

**11. Acceptance criteria.** ID-1…ID-4, PL-7, RV-1/2/3 satisfied; no duplicate reviews possible via the API or directly in the database; all errors use the standard JSON shape; the UI never shows a raw error.

**12. Deliverables.** Identity middleware, error classes, validation helpers, details/review endpoints, details page and review components, tests, guide sections on identity, reviews, errors.

**13. Commits.**
- `feat: add acting-as middleware and users endpoint` *(first commit of the slice)*
- `feat: add place details endpoint`
- `feat: add review upsert endpoint`
- `test: cover review creation, update, validation and identity errors`
- `feat: add acting-as switcher and current user context`
- `feat: build Place Details page with reviews and review form`

**14. Estimate.** 40 minutes. Commit task 3.1 first; at the 2:30 mark, if the slice isn't done, stop at the next green commit and start Slice 4a.

---

### Slice 4 — Tour slots and safe booking (includes required concurrency test)

> **Execution order:** **4a** = booking backend + parallel test (steps 5, 6, 9 below), **4b** = booking UI (step 7). Do 4a completely, with the test green, before starting 4b.

**1. Objective.** Users can see slots, choose seats, and book without any possibility of overbooking, proven by a parallel test on real PostgreSQL.

**2. User value.** A confirmed booking is a real seat; a full tour says so kindly.

**3. Prerequisites.** Slice 1 (schema, seed, safe test setup), Slice 2 plumbing (errors, validation, error handler) and the identity-middleware commit (task 3.1) from Slice 3. The rest of Slice 3 (details page, reviews) is **not** required for 4a.

**4. Database.** `TourSlot.bookedSeats`, `Booking`, and the `CHECK (booked_seats BETWEEN 0 AND capacity)` constraint from Slice 1.

**5. Backend tasks.**

*The concurrency strategy.*

**The race being prevented.** Capacity 10, 9 booked. Requests A and B arrive together. Both read "9 booked, 1 left", both insert, and 11 seats are booked. Wrapping read-then-insert in a transaction does **not** fix this: PostgreSQL's default `READ COMMITTED` isolation lets both transactions read 9 before either commits.

**Chosen approach: one conditional `UPDATE` inside a transaction.** Inside a Prisma interactive transaction:

1. Run a parameterized raw statement shaped like:
   ```sql
   UPDATE tour_slots
   SET booked_seats = booked_seats + $seats
   WHERE id = $slotId AND booked_seats + $seats <= capacity;
   ```
   and read the **affected row count** (`$executeRaw` returns it).
2. **0 rows affected:** the slot is full, lacks enough seats, or doesn't exist. Read the slot (`findUnique`) to decide: missing → 404; `capacity - bookedSeats = 0` → `SLOT_FULL`; otherwise `NOT_ENOUGH_SEATS` with `details.seatsLeft`. Throw; the transaction rolls back (nothing was changed).
3. **1 row affected:** insert the `Booking` row (same transaction), then read the slot to return `seatsLeft`.
4. Commit.

**Why it's safe.** When a transaction updates a row, PostgreSQL takes a row-level lock held until commit or rollback. A concurrent `UPDATE` of the same row **waits**. When the first transaction commits, the waiting statement re-evaluates its `WHERE` clause against the newly committed row version (this is how `READ COMMITTED` behaves for `UPDATE`). So the second request sees the new `booked_seats` and the condition fails if there is no room. Requests for one slot therefore serialize; other slots are unaffected. No application mutex (which would break with more than one server process), no retry loop, no explicit locks to manage. The `CHECK` constraint is a second, independent barrier: even a buggy statement cannot commit an overbooked slot.

**Rollback behavior.** If anything throws inside the transaction callback (the Booking insert failing, the 409 path, a crash), Prisma rolls back everything, including the counter increment. Without the transaction, a failed insert after a successful increment would leak seats permanently. That is why steps 1 and 3 share one transaction.

**Consistency guarantee.** Because the counter increment and the Booking insert commit or roll back together, and nothing else writes either value (Section 5.5), `booked_seats = SUM(bookings.seats)` holds after every request, successful or rejected. Every booking test ends by calling `assertSlotConsistent`.

**Alternatives (briefly; record in `DECISIONS.md`):**

| Alternative | Verdict |
|---|---|
| `SELECT ... FOR UPDATE`, sum bookings, insert | Also correct, single source of truth, but three statements with the lock spanning them. Rejected for complexity. |
| `SERIALIZABLE` isolation + retry | Correct but requires retry logic and surfaces serialization failures to clients. Rejected. |
| Advisory locks | Correct but obscure. Rejected. |
| In-memory mutex in Node | Only safe for one process, not a real solution. Rejected. |
| Prisma `updateMany` with `where: { bookedSeats: { lte: capacity - n } }` | Works only if capacity never changes (an unstated assumption); the raw statement doesn't depend on it. Rejected. |

**Where it breaks / limits (say so in `DECISIONS.md`):** counter/Booking drift if someone writes either outside this code path (mitigated by the `CHECK` and the test); no cancellation, so no decrement path exists; waiting under heavy contention on one slot is serial by design; transaction timeouts under extreme load surface as 500s (see ⚠ below).

⚠ **Prisma details to verify:**
- Interactive transactions have default `maxWait` (~2 s) and `timeout` (~5 s); set them explicitly in `bookingService` with a comment. The connection pool defaults to a small size; many parallel requests wait for connections. If the parallel test shows random 500s, suspect timeouts/pool before suspecting the SQL.
- Whether `$executeRaw` in a transaction client returns the affected-row count as a number in your version (it does in current versions, but check).
- Deadlocks are unlikely (each transaction locks one slot row); let the test confirm that.

*Service and controller.*
- `bookingService.bookSeats(userId, slotId, seats)` implements the steps above and returns `{ booking, slot: { id, capacity, seatsLeft } }`.
- `bookingController` validates `slotId` and `seats` with `parseId` and `parseSeats`, calls the service, returns `201`. `parseSeats` lives in `lib/validation.ts` and uses the single constant `MAX_SEATS_PER_BOOKING = 10`, so the **backend** is the authority on the maximum; the UI's `min(seatsLeft, 10)` merely mirrors it. Validation runs before any database access.
- `placeService.getPlaceDetails` already returns `tourSlots` with `seatsLeft` (Slice 3); confirm ordering by `startsAt`.

**6. API.** `POST /api/slots/:slotId/bookings` per Section 6.3.

**7. Frontend.**
- `services/api.ts`: `bookSeats(slotId, seats)`.
- `components/TourSlotList.tsx`: renders the slot rows from Section 7.6. Each row manages its own local `seats` choice, `pending`, and `message` (success or error). Presentation rules (seats-left text, hide select when full) live here; **capacity math stays on the server** (the UI only displays `seatsLeft`).
- On success: update that row's seats-left from the response, show the confirmation, and call `reload()` of the details page so everything stays consistent. On `SLOT_FULL`/`NOT_ENOUGH_SEATS`: show the friendly message and refetch.
- Button disabled while pending (also prevents accidental double submits; true idempotency is a bonus that is **not** being built).

**8. Edge cases.** Unknown slot → 404; `seats` 0, negative, fractional, > 10, non-numeric → 400; missing/invalid user → 401; more seats than remain → 409 `NOT_ENOUGH_SEATS`; zero left → 409 `SLOT_FULL`; two simultaneous last-seat requests → exactly one 201; the same user booking twice is allowed; slot belongs to a place without any UI path to it (not possible via UI).

**9. Tests.**
- **Integration, real PostgreSQL — `booking.concurrency.test.ts` — REQUIRED.** Use Supertest against `app` (⚠ prefer starting one listening server on port 0 and passing it to `request()` so 20 simultaneous requests share one server). Create data with factories (users, place, slot).
  1. **Scenario A (the core test):** capacity 10, 8 already booked **with a matching Booking row of 8 seats** (so the invariant holds from the start). Fire **20 simultaneous** `POST` requests for 1 seat each with `Promise.all`, rotating across the three user ids. Assert:
     - every response is 201 or 409 (**zero 500s**, which also detects pool/timeout trouble);
     - exactly **2** are 201 and **18** are 409 `SLOT_FULL`;
     - in the DB: `bookedSeats == capacity` and `SUM(booking.seats) == capacity`; booking row count equals 10; `assertSlotConsistent` passes.
  2. **Scenario B (mixed sizes):** 3 seats left, 10 simultaneous requests for 2 seats each. Exactly **one** succeeds; the rest return `NOT_ENOUGH_SEATS`; `bookedSeats` is capacity − 1 and equals the sum of bookings (`assertSlotConsistent`).
  3. **Scenario C (failure leaves no trace):** a request rejected with 409 leaves `bookedSeats` and the booking count unchanged.
- **Integration (small):** seats `0`, `-1`, `1.5`, `"2"`, missing → 400 `VALIDATION_ERROR`; **seats `11` → 400 even when the slot has plenty of room** (proves the maximum is enforced by the backend, not the UI); seats `10` on a slot with ≥10 left → 201; seats `10` when fewer than 10 are left → 409 `NOT_ENOUGH_SEATS`; unknown slot → 404; missing user → 401; successful booking returns the correct `seatsLeft`.
- **Fails-before, passes-after (recommended for the narrative and for `AI_USAGE.md`):**
  1. Commit a deliberately **naive** read-then-insert implementation.
  2. Commit the parallel test and run it; it should fail (races are probabilistic; if it passes by luck, raise the request count or temporarily insert a short artificial delay between the read and the write; do **not** commit the delay).
  3. Commit the atomic fix; the test passes. The history tells the story.

**10. Manual verification.** Book 1 seat in Jerónimos, see seats-left drop; book the Alfama slot with 2 seats left using 3 seats → "Only 2 seats left"; book 2 → success and "Fully booked"; try the Alfama full slot (button disabled); in two browser tabs as different users, book the last seat at the same time and confirm one wins; confirm via `psql` (consistency query, Section 5.5) that `booked_seats = sum(seats)`. Also `curl` a booking with `seats: 11` and confirm the backend returns 400 (the UI cannot send it).

**11. Acceptance criteria.** BK-1…BK-8 satisfied; the parallel test passes repeatedly (run it 5 times in a row and keep it stable); no 500s; `CHECK` constraint present; `assertSlotConsistent` passes after every scenario; seat counts above 10 are rejected by the backend; full slots never show an error page.

**12. Deliverables.** `bookingService.ts`, controller/route, `TourSlotList`, both test files, concurrency section of `DECISIONS.md`, guide section on booking.

**13. Commits.**
- `feat: add naive tour booking endpoint (read then insert)` *(deliberate, for the history)*
- `feat: enforce 10-seat maximum in backend validation`
- `test: add parallel booking test that exposes overbooking`
- `fix: make booking atomic with conditional update in a transaction`
- `test: add mixed-size and rollback booking scenarios`
- `feat: add tour slot list and booking UI with friendly full-slot messages`
- `docs: document concurrency strategy and alternatives`

**14. Estimate.** 60 minutes. If time is tight, drop the naive-first commits and Scenario C, never the Scenario A test. **Checkpoint C3 (Section 12):** Scenario A green on the atomic implementation.

---

### Slice 5 — Integration and UX completion

**1. Objective.** Verify the whole journey and complete all states, photos and basic responsiveness. No new features.

**2. User value.** The product feels finished and trustworthy.

**3. Prerequisites.** Slices 0–4.

**4. Database.** None.

**5. Backend tasks.** Fix any issues found; confirm `notFound` handles unknown `/api/*` paths with the standard error shape; confirm unexpected errors return the generic 500 without a stack trace.

**6. API.** No changes.

**7. Frontend.**
- Walk the journey: Explore → filter → sort → open place → switch user → review → edit review → book → book to full → Back to Explore (counts updated).
- Verify every state in 7.5/7.6 exists: skeletons, empty, error with retry, not-found.
- Build the `PlaceImage` placeholder state per 7.8 (it is the default for most places). **Last, and only if checkpoints C1 and C3 are green:** add up to five photos within a 10-minute cap; otherwise ship placeholders.
- Confirm both synthetic-data notices are visible (Explore footer, Reviews section).
- Apply final tokens/typography; check contrast pairs (⚠ verify list in 7.1).
- Basic responsive check at ~390 px and ~768 px: no horizontal scroll, grids collapse, tours panel moves below the main column.
- Keyboard pass: tab order, visible focus, star radios usable by keyboard, selects usable.
- No `alert()`/`confirm()` anywhere (`grep` for it).
- Remove leftover console logs and dead code.

**8. Edge cases.** Rapid user switching (stale responses), invalid `:id` URLs, mostly placeholders with a few photos, long place names, long review text (wrap), many reviews (3 max in seed, but test layout by temporarily seeding extra locally if needed).

**9. Tests.** Re-run all tests. Add a test only for a bug you actually found.

**10. Manual verification.** Complete the final checklist (Section 14) UI items.

**11. Acceptance criteria.** Q-1…Q-5, UX-1…UX-3 satisfied; the journey works without console errors; the UI reads consistently.

**12. Deliverables.** Polished client, `PlaceImage` with placeholder, 0–5 photos with `CREDITS.md`, notes on bugs found.

**13. Commits.**
- `feat: add loading, empty and error states to both pages`
- `feat: add PlaceImage placeholder and up to five place photos`
- `style: apply dark theme tokens and typography`
- `fix: <specific issue found during walkthrough>` (as many as needed)

**14. Estimate.** 20 minutes. Photos are last and optional.

---

### Slice 6 — Final verification and submission

**1. Objective.** Prove it works from a fresh clone and finish the documentation.

**2. User value.** The reviewer can run it without guessing.

**3. Prerequisites.** Slice 5.

**4–6. Database/backend/API.** No functional changes.

**7. Frontend.** None.

**8. Tasks and edge cases.**
- Run `npm test` (ranking + concurrency + integration). Run the concurrency test several times.
- **`npm run verify`** must pass: server and client TypeScript checks, client production build, and all required backend tests. There is no frontend test framework and no server ESLint (not required for this assignment); client ESLint from the Vite template may stay but is not a gate.
- Confirm the `TEST_DATABASE_URL` guard from a fresh clone: unset it and see `npm test` fail safely; restore it.
- **Fresh-clone dry run:** clone into a temporary directory, delete any local `.env` and `node_modules`, and follow the README exactly. Fix any mismatch **in the README or scripts**, not by remembering steps.
- Re-check `.gitignore`; search history for secrets (`git log -p | grep -i password` as a quick sanity check; the only password placeholder is in `.env.example`).
- Finish `README.md`, `DECISIONS.md`, `AI_USAGE.md`, `docs/PROJECT_GUIDE.md`; list known limitations and "what I didn't finish and how I'd do it."
- Review `git log --oneline` for clear messages; do not rewrite history.

**9. Tests.** The full suite, run from a fresh clone.

**10. Manual verification.** Follow the README as a stranger would.

**11. Acceptance criteria.** The final checklist in Section 14 is fully ticked.

**12. Deliverables.** Finished docs; clean history.

**13. Commits.**
- `docs: finish README with setup, scripts and limitations`
- `docs: complete DECISIONS.md and AI_USAGE.md`
- `docs: complete project guide`
- `chore: fix setup issues found in fresh-clone check`

**14. Estimate.** 25 minutes. Do not start bonuses unless the checklist is complete **and** time remains. If so, the cheapest option is a mobile layout pass; double-click safety (idempotency keys) is a design task of its own.

---

## 9. Testing strategy

### 9.1 Test inventory

| Test file | Kind | Needs PostgreSQL | What it proves |
|---|---|---|---|
| `unit/ranking.test.ts` | Unit | No | Weighted score, edge cases, neutral prior, comparator (**required**) |
| `unit/testDatabaseGuard.test.ts` | Unit | No | Missing or unsafe `TEST_DATABASE_URL` is rejected before any DB access |
| `integration/booking.concurrency.test.ts` | Integration | **Yes** | No overbooking under parallel requests; counter/Booking consistency; rollback (**required**) |
| `integration/schema.test.ts` | Integration | Yes | Constraints reject bad data at the database level |
| `integration/places.test.ts` | Integration | Yes | Backend filtering and sorting; ordering matches the seed |
| `integration/reviews.test.ts` | Integration | Yes | Upsert behavior, validation, uniqueness |
| `integration/identity.test.ts` | Integration | Yes | Missing/invalid acting user; 404s (can be folded into the others) |

The client has no automated tests and no test framework (not required; time is better spent on the server). It is covered by TypeScript checking and the production build, both part of `npm run verify`. State this in `DECISIONS.md` as a trade-off.

### 9.2 Environment rules

- Real PostgreSQL only; SQLite or mocks cannot demonstrate row-lock behavior.
- **Test database safety rules** (the tests truncate tables, so these are non-negotiable):
  1. `TEST_DATABASE_URL` is **required**. No default, and **never** a silent fallback to `DATABASE_URL`.
  2. `vitest.config.ts` loads `server/.env` and calls `assertTestDatabase` **before any database connection**. It throws a readable error (non-zero exit, nothing touched) when the value is missing or empty, unparsable, equal to the dev URL (compared on host, port, and database name), or not clearly a test target (database name must be `wayfarer_test` or contain `test`).
  3. On success the config injects the test URL as `DATABASE_URL` for test workers, so application code under test cannot see the dev URL.
  4. `globalSetup` migrates the test database `wayfarer_test` only (child process environment override).
  5. `resetDatabase()` re-verifies at runtime with `SELECT current_database()` and aborts before any `TRUNCATE` unless it is `wayfarer_test` (or database name contains `test`).
  6. The guard is a pure function with its own unit test (`testDatabaseGuard.test.ts`).
  7. `.env.example` contains a valid `TEST_DATABASE_URL` (e.g. `postgresql://postgres:password@localhost:5432/wayfarer_test`), so a fresh clone works after `npm run setup`; the README explains the variable and what the failure looks like.
  8. The dev server and the seed never read `TEST_DATABASE_URL`.
  9. Strict database-level isolation: development uses `wayfarer`, tests use `wayfarer_test`.
- `globalSetup` migrates the test schema once; each integration file resets data in `beforeEach` (truncate) and builds its own fixtures with small factories.
- Test files run **serially** (⚠ `fileParallelism: false`) because they share tables; tests *within* the concurrency file fire parallel HTTP requests deliberately.
- `npm test` at the repo root runs the server's Vitest suite. The README states that the local PostgreSQL service must be running.
- Raise the Prisma connection limit in the test URL (e.g. `connection_limit=20`) or keep the parallel request count at about 20.

### 9.3 Priority if time runs out

1. Ranking unit test. 2. `TEST_DATABASE_URL` guard (it protects your data and the concurrency test depends on it). 3. Scenario A of the concurrency test. 4. Schema constraint tests. 5. Review upsert test. 6. Everything else.

---

## 10. Documentation strategy

Documentation is built incrementally; each slice lists the doc work it owns. Do not leave it all to Slice 6.

| File | Purpose | Written in |
|---|---|---|
| `README.md` | What it is, features, stack, prerequisites, setup commands, how to run tests, structure, limitations | Skeleton in S0, finished in S6 |
| `DECISIONS.md` | Why PostgreSQL + Prisma; ranking formula, parameters, alternatives, limits; concurrency strategy, why it is safe, alternatives, limits; schema deviations; the ambiguity table (2.3); the 3-user review cap; what was not finished | Appended in S1, S2, S3, S4 |
| `AI_USAGE.md` | Tools used and for what; one or two real prompts and what you did with answers; **one real mistake or unhelpful suggestion** and how you noticed it. Include this planning conversation. Never fabricate | Notes from S0, finished in S6 |
| `docs/PROJECT_GUIDE.md` | How the actual implementation works (below) | Sections added in each slice |

**README setup:**

```bash
# Ensure local PostgreSQL 18 service is running with wayfarer and wayfarer_test databases created
npm run setup                  # 1. install, create .env, generate Prisma client, migrate, seed
npm run dev                    # 2. start API (3001) and client (5173)
```

Tests: `npm test`; full quality gate: `npm run verify` (TypeScript checks, client production build, backend tests). Also document: the required `TEST_DATABASE_URL` and the safe failure when it is missing or unsafe; configuring PostgreSQL connection via `server/.env`; the demo-identity disclaimer (ID-5); and the **synthetic demonstration data** note for all reviews (RV-8).

**`docs/PROJECT_GUIDE.md` outline** (describe the real implementation, small diagrams only where they help, no pasted source code):

1. System architecture · 2. Client ↔ server communication · 3. Responsibilities of `client/` and `server/` · 4. Request path (route → controller → service → Prisma) · 5. Database models and relationships · 6. Migrations · 7. Seed data · 8. Filtering and sorting · 9. Ranking formula · 10. Reviews (upsert) · 11. Acting-as mechanism · 12. Tour slots and bookings · 13. The concurrency-safe transaction · 14. Frontend state and API handling · 15. Error handling · 16. Test organization and commands · 17. How to add a feature safely.

---

## 11. Git workflow

- Initialize Git before writing code. Commit when a task leaves the app working. Aim for roughly 25–40 commits. **Never squash or rewrite history.** Wrong turns and fixes are fine.
- Message format: `type: what changed` with `feat`, `fix`, `test`, `docs`, `chore`, `style`; add a "why" line in the body when not obvious.
- Before each commit: the app starts; relevant tests pass; `git status` contains no `.env`, `node_modules` or build output; docs are updated if behavior changed.
- One logical change per commit (a function and its test may share a commit, but a UI and a migration should not).

| Slice | Representative commits |
|---|---|
| 0 | `chore: initialize monorepo`, `feat: scaffold Express app with health endpoint`, `chore: scaffold React client with Tailwind` |
| 1 | `feat: add Prisma schema`, `feat: add check constraints`, `feat: add idempotent seed`, `feat: require explicit TEST_DATABASE_URL`, `test: add guard and constraint tests` |
| 2 | `feat: implement weighted ranking`, `test: add ranking unit tests`, `feat: add places endpoint`, `feat: build Explore page` |
| 3 | `feat: add acting-as middleware`, `feat: add place details endpoint`, `feat: add review upsert`, `test: cover review rules`, `feat: build details page` |
| 4 | `feat: add naive booking`, `test: add parallel booking test`, `fix: make booking atomic`, `feat: add booking UI` |
| 5–6 | `feat: add loading/error/empty states`, `feat: add photos`, `docs: …` |

---

## 12. Time budget

| Block | Time | Cumulative |
|---|---|---|
| Slice 0 Foundation | 0:25 | 0:25 |
| Slice 1 Database + seed + safe test setup | 0:45 | 1:10 |
| Slice 2 Discovery + ranking (**critical**) | 0:55 | 2:05 |
| Slice 3 Details + reviews (identity first) | 0:40 | 2:45 |
| Slice 4 Tours + booking (**critical**) | 1:00 | 3:45 |
| Slice 5 Integration + UX (photos last, optional) | 0:20 | 4:05 |
| Slice 6 Verification + docs | 0:25 | 4:30 |
| Spare (if you have 5 h) | 0:30 | 5:00 |

**Critical-path checkpoints** (elapsed time; if you are behind, apply the action immediately):

| Checkpoint | Target | Hard limit | Condition | If behind |
|---|---|---|---|---|
| **C1** | 2:05 | 2:15 | Ranking function + unit test passing and committed; `/api/places` returns the ranked list | Stop UI polish on Explore; keep it plain |
| **C2** | 2:15 | 2:30 | Task 3.1 (identity middleware) committed; at 2:30 Slice 4a starts regardless | Stop Slice 3 at the next green commit and start Slice 4a; finish Slice 3's UI afterwards |
| **C3** | 3:45 | 4:00 | Scenario A of the concurrency test passes on the atomic implementation; `TEST_DATABASE_URL` guard works | Drop 4b polish, Scenario C, naive-first commits; no photos, no `sort=name`; finish docs |

Use any spare time for setup surprises (Prisma, local PostgreSQL, TypeScript module settings), not new features.

**Never cut:** the ranking test; the parallel booking test; atomic booking with the friendly full message; the `TEST_DATABASE_URL` guard; the `bookedSeats` consistency assertions; the synthetic-data labels; `DECISIONS.md`, `README.md`, honest `AI_USAGE.md`; small commits.

**Cut in this order if time is short:**

1. All photos (placeholders for every place are acceptable), then visual polish beyond tokens and states.
2. `sort=name` (keep only `top`; remove the select, keep the hint).
3. Naive-first commits and Scenario C of the concurrency test.
4. URL query-string persistence of filters.
5. `GET /api/categories` (hardcode categories in the client; note as a limitation).
6. `myReview` prefill (empty form with a note "submitting updates your existing review").
7. Hand-written `CHECK` constraints (keep service-level guards; say you would add them).
8. Client-side form validation (the server validates anyway).

---

## 13. Risks and simplifications

| Risk | Likelihood | Mitigation |
|---|---|---|
| Prisma major-version drift (setup differs between 6 and 7) | High | Pin the version; follow only that version's docs; budget time in S0/S1. |
| Prisma interactive-transaction timeouts / pool exhaustion in the parallel test | Medium | Set timeouts explicitly; ~20 requests; raise `connection_limit` in the test URL; assert zero 500s so it shows up. |
| Test database approach | Medium | Dedicated `wayfarer_test` database with guard rules. |
| Tests wipe development data because of a missing or wrong URL | Low likelihood, high impact | Required `TEST_DATABASE_URL`, no fallback, guard before any connection, runtime re-check in `resetDatabase()`, unit test of the guard. |
| Counter and booking rows drift apart | Low | Single write path, one transaction, `CHECK`, `assertSlotConsistent` in every booking test (Section 5.5). |
| Raw SQL naming and quoting | Medium | `@@map`/`@map` to snake_case. |
| Hand-edited `CHECK` constraints lost by `db push` | Low | Migrations only; documented. |
| Express 4 async errors hang requests | Medium | Verify installed Express major; wrap or upgrade. |
| Tailwind v3/v4 install differences | Medium | Follow the official guide for the installed major only. |
| ESM/CommonJS mismatches between `tsx`, Vitest, Prisma output | Medium | Choose one setup in S0 and don't change it. |
| Fresh-clone assumptions (missing `.env` or credentials) | Medium | `scripts/setup.mjs` creates `.env`; README explains configuration; dry run in S6. |
| The race test may pass against the naive code by luck | Medium | More requests or a temporary delay (never committed). |
| 3-user review cap makes the demo less dramatic | Certain | Documented; the unit test shows the 1-vs-312 case. |
| Image sourcing eats time or licences are unclear | Medium | At most 4–5 images, 10-minute cap at the very end, skipped if behind; placeholders are the designed default. |
| Scope creep (search, cancel, bookings page) | Medium | Section 2.2 is binding. |

**Honest limits (put in README/`DECISIONS.md`):** all reviews are synthetic demonstration data; `X-User-Id` is trivially spoofable and is not security; seats-left is not real-time; there is no cancellation; the client has no automated tests; `m = 10` is a judgment call; the Bayesian average ignores recency and review spam; new genuinely great places are penalized until they accumulate reviews.

---

## 14. Final acceptance checklist

**Setup and process**
- [ ] A fresh clone follows the README (≤3 commands) and works without guessing (Q-7).
- [ ] `npm test` runs the ranking test and the concurrency test (Q-6) and passes, repeatedly.
- [ ] `npm run verify` passes: server and client TypeScript checks, client production build and all backend tests (Q-10). No frontend test framework or server ESLint is required.
- [ ] With `TEST_DATABASE_URL` unset, equal to `DATABASE_URL`, or not a test target, `npm test` fails immediately with a clear message and changes nothing (Q-11).
- [ ] No secrets, `node_modules` or build output in the repo or history (Q-9).
- [ ] History shows many small, meaningful commits; nothing squashed (Q-9).
- [ ] `README.md`, `DECISIONS.md`, `AI_USAGE.md`, `docs/PROJECT_GUIDE.md` exist and match the code (Q-8, ID-5).

**Data and backend**
- [ ] Seed creates 3 users, 10 Lisbon places, 23 reviews, 5 tour slots, idempotently, and labels the reviews synthetic demonstration data (ID-1, PL-1/2/3/8, RV-8).
- [ ] Filtering and sorting are visibly done by the backend (network tab) (PL-5/6).
- [ ] The weighted ranking puts Pastelaria Brilho 4th, not 1st; the neutral prior (3.0 with no reviews anywhere, the global average for an unreviewed place) is documented and tested (RV-4/7).
- [ ] One review per user per place enforced by the database; resubmission updates (RV-2/3).
- [ ] Invalid acting user returns 401; invalid input returns 400; unknown resources 404 (ID-4).
- [ ] Parallel booking test on real PostgreSQL passes; `bookedSeats == SUM(bookings)`; zero 500s (BK-4…7).
- [ ] A rejected booking changes nothing (BK-6).
- [ ] Seat counts above 10 (and other invalid values) are rejected by the backend with 400, independent of the UI.

**UI**
- [ ] Exactly two screens; header with "Acting as" switcher (UX-2, ID-2/3).
- [ ] Review count is shown next to every rating (PL-4).
- [ ] The synthetic-data notice is visible on Explore and under Reviews (RV-8).
- [ ] At most five photos; every other place shows the designed placeholder; no broken-image icons.
- [ ] Loading, empty and error states on both screens; retry works (Q-2/3/4).
- [ ] Review form creates and edits; shows the user's own review prefilled (RV-1/3).
- [ ] Booking shows seats left, a friendly confirmation, and a friendly full/not-enough message; no `alert()` (BK-3/8, Q-5, UX-3).
- [ ] Places without tours show no empty tours section.
- [ ] Dark warm palette with sufficient contrast; visible focus states (UX-1).
- [ ] Layout works on desktop and collapses sensibly on a narrow window (Q-1).

---

## Appendix A — Requirements traceability

| Requirement | Slice | Implementation task | Acceptance |
|---|---|---|---|
| ID-1 three seeded users | 1 | Seed users 1–3 | Seed query shows 3 users |
| ID-2/3 switcher + header | 3 | `CurrentUserContext`, `UserSwitcher`, `api.ts` adds `X-User-Id` | Switching changes `myReview` and request headers |
| ID-4 validate user | 3 | `attachUser`, `requireUser` | `identity` tests: 401 cases |
| ID-5 not-security disclaimer | 6 | README + `DECISIONS.md` | Docs state it plainly |
| PL-1/2/3 city, ten places, 1–2 review place | 1 | Seed spec 5.6 | Seed counts match; Brilho has 1 review |
| PL-4 list UI | 2 | `ExplorePage`, `PlaceCard` | Review count visible |
| PL-5 backend filter | 2 | `placeService.listPlaces` | `places` test; query string in network tab |
| PL-6 backend top sort | 2 | Ranking + comparator in service | Ordering test equals 5.7 |
| PL-7 details view | 3 | `PlaceDetailsPage`, details endpoint | Manual walk-through |
| PL-8 seed command | 1 | `db:seed` truncates and recreates | Run twice, same counts |
| RV-1 rating + text | 3 | `PUT review`, `ReviewForm`, validation | Review and validation tests |
| RV-2 unique per user/place | 1, 3 | `@@unique`, upsert | `schema` + `reviews` tests |
| RV-3 update on resubmit | 3 | `saveReview` upsert | Count stays 1 after second submit |
| RV-4/5 count-aware score, explained | 2 | `ranking.ts`, `DECISIONS.md` | Unit test + doc |
| RV-6 ranking test | 2 | `ranking.test.ts` | Passes in `npm test` |
| RV-7 empty-DB behavior | 2 | `NEUTRAL_PRIOR_RATING = 3.0`; zero-review place scores `C` (5.8) | Unit + integration test |
| RV-8 synthetic labelling | 1, 2, 3, 6 | Seed header + printed line, Explore footer, Reviews line, README | Notices visible; docs state it |
| BK-1/2/3 slots, seats, remaining | 4 | Details endpoint `seatsLeft`, `TourSlotList` | Manual + API test |
| BK-4/5/6 atomic, transactional, no leak, counter consistency | 4 | Conditional `UPDATE` + insert in one transaction; consistency rules (5.5) | Scenario A/B/C + `assertSlotConsistent` |
| BK-7 parallel test, real Postgres | 4 | `booking.concurrency.test.ts` | Passes repeatedly |
| BK-8 friendly full message | 4, 5 | `SLOT_FULL` code → UI message | Manual full-slot check |
| Q-1…Q-5 UI quality | 5 | States, confirmation, responsive check | Section 14 UI checklist |
| Q-6 one test command | 1, 6 | Root `npm test` | Fresh clone run |
| Q-7 Simple setup start | 0, 6 | `npm run setup`, `npm run dev` | Fresh clone dry run |
| Q-8 docs | 0–6 | Section 10 | Files present and accurate |
| Q-9 git hygiene | 0–6 | Section 11 | History review |
| Q-10 quality gates | 0, 6 | `typecheck`, `build`, `verify` scripts | `npm run verify` passes |
| Q-11 safe test config | 1 | `assertTestDatabase`, runtime re-check, guard unit test | Unset/unsafe URL fails before any DB access |
| UX-1…UX-3 design | 5 | Sections 7.1–7.7 | Visual + `grep alert` |

---

## Appendix B — Approved decisions and clarifications (revision 2)

All Appendix B decisions from revision 1 were reviewed and approved, with the clarifications below. They are now binding.

| # | Decision | Approved clarification | Where it lives in this plan |
|---|---|---|---|
| 1 | Lisbon, real place names | All invented reviews are clearly labelled **synthetic demonstration data** (seed file, UI notices, README). | 2.3 #13, 5.6, 7.5, 7.6, RV-8 |
| 2 | Photos | **4–5 properly licensed images at most**, placeholders elsewhere; sourcing is time-boxed (10 min), last, and optional; it must not delay implementation. | 2.3 #11, 7.8, Slice 5, Section 12 |
| 3 | `bookedSeats` counter | Counter update and Booking insert in the **same PostgreSQL transaction**; counter/booking consistency is an explicit invariant with a single write path, a `CHECK`, a verification query and `assertSlotConsistent`. | 5.5, Slice 4 |
| 4 | `PUT /api/places/:id/review` and consolidated `GET /api/places/:id` | Kept. Review uniqueness is a **database-level composite unique constraint**; the upsert targets it (never find-then-write). | 5.3, 6.2, Slice 3 |
| 5 | `m = 10` | Kept. Interpretation documented (50% weight at 10 reviews; weight table) and a **neutral prior** defined (`3.0` when no reviews exist anywhere; the global average for an unreviewed place). | 5.8, Slice 2 |
| 6 | Database isolation | Dedicated databases: `wayfarer` for dev, `wayfarer_test` for tests, with a **required explicit `TEST_DATABASE_URL`**: no fallback to the dev database; tests fail safely, before any DB access, when it is missing or unsafe. | 9.2, Slice 1, Q-11 |
| 7 | Minimal dependencies | Unchanged. | 3.4 |
| 8 | Testing and linting scope | No frontend test framework and no server ESLint. Required gates: server and client TypeScript checks, client production build, all backend tests (`npm run verify`). | 3.4, 9.1, Slice 6, Q-10 |
| 9 | Max 10 seats per booking | Kept and **validated on the backend** with one constant; the UI mirrors but doesn't decide. Tested with 11 seats. | 2.3 #3, 6.3, Slice 4 |
| — | Critical path | Ranking and PostgreSQL concurrency keep the largest, earliest time blocks, explicit checkpoints C1–C3, and a rule that allows Slice 4a before the rest of Slice 3. | 1.2, 8, 12 |

### Revision 2 timing changes

Slice 1 +5 min (test guard), Slice 2 +5 min (shared plumbing moved here), Slice 3 −5 min, Slice 4 +5 min, Slice 5 −10 min (smaller image scope, no client lint). Total unchanged at 4.5 h.
