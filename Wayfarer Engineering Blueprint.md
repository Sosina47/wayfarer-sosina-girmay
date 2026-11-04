# Wayfarer: Engineering Blueprint

Planning document for the Wayfarer full-stack take-home. Stack: React + TypeScript + Vite, Tailwind, Node + Express + TypeScript, PostgreSQL, Prisma, Vitest + Supertest.

I have not verified current library docs (Prisma, Tailwind and Vitest all change majors often). Anything marked **verify** is a spot where tutorials may not match the version you install.

## 1. Requirements analysis

### Mandatory vs. optional

| Area | Mandatory | Optional bonus (pick at most one, only after A–D) |
| --- | --- | --- |
| Data | Seed command: 3 users, \~10 places with reviews, at least one place with 1–2 reviews | none |
| Places | List page with category filter and "top rated" sort, both done in the backend; detail page per place | none |
| Reviews | 1–5 rating plus short text; one per user per place; re-reviewing updates | none |
| Ranking | Score that accounts for review count; explained in DECISIONS.md; unit-tested | none |
| Booking | Tour slots with capacity, seats-left display, never overbooked under parallel requests, parallel automated test, clear "full" message | Double-click/retry safety |
| Quality | Desktop layout, loading and error states, both tests run with one command, README runs from a fresh clone in 3 commands or fewer | Mobile layout |
| Docs/process | README, DECISIONS.md, AI\_USAGE.md, small meaningful commits, no secrets or `node_modules` committed | Your own idea |

### Core business rules

1. (user, place) is unique for reviews, and a second submission updates the first.
2. Rating is an integer from 1 to 5.
3. A place's rank must reflect both its average and how many reviews back it.
4. Filtering and sorting happen on the server.
5. For every slot, the sum of booked seats never exceeds capacity, even under concurrency.
6. Seats left = capacity minus booked seats, shown to the user.
7. A full slot returns a business error (HTTP 409) that the UI turns into a readable message.
8. The acting user comes only from `X-User-Id`, and every write is attributed to that user.

### Ambiguities and proposed assumptions

Write these in DECISIONS.md. The assignment rewards saying what you assumed.

1. **Three users cap every place at 3 reviews.** With a unique (place, user) constraint and only 3 seeded users, no place can have more than 3 reviews, so the "312 reviews" scenario cannot exist in live data.
   - Recommendation: keep exactly 3 users, as the assignment says. Seed places with 0–3 reviews. Prove the 1-review vs. 312-review case in the unit test, since the scoring function takes plain numbers.
   - Alternative: seed 20 extra reviewer users. More convincing demo, but it clutters the switcher and bends the "3 users" rule.
   - Tradeoff: the live demo shows less dramatic differences, so say this explicitly in DECISIONS.md.
2. **Multiple bookings by the same user in the same slot are allowed.** Each is a separate Booking row. Simplest, and nothing says otherwise.
3. **Seats per booking:** integer ≥ 1, with a sanity upper bound (say 20) purely to avoid integer overflow. A request for more than are left returns 409.
4. **Past slots:** seed only future slots, using times relative to the seed run. No "already started" check; document that.
5. **Review text is required**, 1–500 characters, because the spec says "with a short text". Ratings are whole stars only.
6. **No cancellation and no "my bookings" page.** Not required. The booking response is the confirmation.
7. **Places without tours** simply have no slots, and the UI says so. Seed at least one almost-full slot and one full slot so the "full" message is easy to see.
8. **Unreviewed places** score as the global mean (see section 5) and display "No reviews yet".
9. **Category** is one string per place, matched exactly. "All" means no filter.
10. **Local PostgreSQL service is used** (PostgreSQL 18). Configured via `DATABASE_URL` (`wayfarer`) and `TEST_DATABASE_URL` (`wayfarer_test`). Docker is not used.
11. **Time zones:** store UTC, format in the browser.
12. **Seats left is not live.** It refreshes after your own actions, and a stale view is covered by the 409 message.

### What the reviewers are actually evaluating

| Weight | What it means for you |
| --- | --- |
| Problem solving 25% | DECISIONS.md must contain real reasoning, the alternatives you rejected, and where your choices break. The biggest lever. |
| Working software 20% | Do a fresh-clone dry run in a temp folder before submitting. |
| Code quality 15% | Controllers are thin, services hold the rules, UI components contain no business logic. |
| Git history 15% | Roughly 25–40 small commits that tell the story. Never squash. |
| Testing 10% | Two tests that target risky behavior. |
| AI transparency 10% | Keep notes as you go. Disclose this planning conversation too. |
| UX 5% | Clear states only; don't polish. |

## 2. Database design

Use `Int` auto-increment primary keys: easy to read, easy to type into the header, adequate here. Map names to snake\_case with `@map`/`@@map` so any raw SQL stays readable and unquoted.

### Entities

**User**: `id` (PK), `name`. Seeded with fixed ids 1–3 so a stored `X-User-Id` stays valid after re-seeding.

**Place**

| Field | Notes |
| --- | --- |
| `id` | PK |
| `name`, `description` | text |
| `category` | string. A separate Category table adds a join and CRUD surface you don't need. |
| `openingHours` | free text such as "Tue–Sun 09:00–18:00". Structured hours are overengineering for display-only data. |

**Review**

| Field | Notes |
| --- | --- |
| `id` | PK |
| `placeId` | FK → Place |
| `userId` | FK → User |
| `rating` | int, `CHECK (rating BETWEEN 1 AND 5)` |
| `body` | text |
| `createdAt` | set on insert |
| `updatedAt` | My addition. Updating a review without recording when is odd, and Prisma's `@updatedAt` makes it free. |

**TourSlot**

| Field | Notes |
| --- | --- |
| `id` | PK |
| `placeId` | FK → Place |
| `startsAt` | `timestamptz` (`@db.Timestamptz` in Prisma; **verify**, Prisma's default is timestamp without time zone) |
| `capacity` | int, `CHECK (capacity > 0)` |
| `bookedSeats` | int, default 0, `CHECK (booked_seats BETWEEN 0 AND capacity)`. My addition (see below). |

**Booking**

| Field | Notes |
| --- | --- |
| `id` | PK |
| `slotId` | FK → TourSlot |
| `userId` | FK → User |
| `seats` | int, `CHECK (seats > 0)` |
| `createdAt` | set on insert |

Prisma cannot express CHECK constraints in `schema.prisma`. Create the migration with `prisma migrate dev --create-only`, then add the `ALTER TABLE … ADD CONSTRAINT …` lines by hand before applying. About 10 minutes of work, but the database becomes the last line of defense: "even if my code is wrong, Postgres refuses to store an overbooked slot" is a strong interview sentence.

### Relationships

- Place 1—N Review, Place 1—N TourSlot, TourSlot 1—N Booking.
- User 1—N Review, User 1—N Booking.
- Leave Prisma's default `Restrict` delete behavior. Only seed and test cleanup delete data, child-first (or `TRUNCATE … CASCADE`).

### Indexes

- **Review `UNIQUE (placeId, userId)`** also serves "reviews of this place", since `placeId` is its leading column. No extra index.
- **TourSlot `(placeId, startsAt)`** serves the detail page query.
- **Booking `(slotId)`**. Postgres does not auto-index foreign keys; tests and any reporting sum seats per slot.
- **Place `(category)`** is cheap but irrelevant at 10 rows. Add it only as a signal of intent; don't claim a performance win.
- Skip everything else (e.g. `userId` indexes). No query needs them.

### One review per user per place

The guarantee is the **database unique constraint**. In the service, use Prisma's `upsert` keyed on the composite unique key, not "find, then create or update". The find-then-write version has the same race as the booking bug: two simultaneous first-time submissions both find nothing and both insert, and the constraint rejects one with an error.

Two things to **verify**:

- Whether Prisma translates your composite-key upsert to a native `INSERT … ON CONFLICT` (its docs list specific conditions).
- If not, catch the unique-violation error (`P2002`) once and retry as an update. A double-submit race here is low-stakes, and the constraint protects integrity either way.

### Do we need `bookedSeats`?

| Approach | How it stays correct | Cost |
| --- | --- | --- |
| A. Derived: `SUM(bookings.seats)` | Lock the slot row (`SELECT … FOR UPDATE`), sum, compare, insert | Three statements, raw SQL (Prisma has no row-lock API), lock must be held across all of them |
| **B. Counter `bookedSeats` (recommended)** | One conditional `UPDATE` both checks and reserves atomically | Denormalized: counter and Booking rows could in theory drift |

I recommend B because check-and-reserve becomes a single statement, easy to reason about and defend. Mitigate drift four ways:

- Only one code path writes either value.
- Both writes happen in one transaction.
- The CHECK constraint backs it up.
- A test asserts `bookedSeats == SUM(booking.seats)` after the parallel run.

Mention A in DECISIONS.md as the rejected alternative: its advantage is a single source of truth, its disadvantage is more moving parts. This deviates from the suggested model, which the assignment allows if you say why.

## 3. System architecture

```
React (Vite dev server) ──/api proxy──► Express ──Prisma──► PostgreSQL (local)
```

The Vite dev proxy forwards `/api` to Express, so there is **no CORS setup**. A custom header like `X-User-Id` triggers CORS preflight on cross-origin calls, one more thing for a beginner to debug.

### Folder structure

```
wayfarer/
├─ README.md  DECISIONS.md  AI_USAGE.md
├─ .env.example  .gitignore  .nvmrc
├─ package.json              # npm workspaces + root scripts
├─ server/
│  ├─ prisma/  schema.prisma  migrations/  seed.ts
│  ├─ src/
│  │  ├─ app.ts              # builds the Express app, does NOT listen (Supertest needs this)
│  │  ├─ server.ts           # imports app, calls listen
│  │  ├─ db.ts               # single PrismaClient instance
│  │  ├─ errors.ts           # AppError + subclasses (NotFound, SlotFull, ...)
│  │  ├─ middleware/         # currentUser.ts, errorHandler.ts
│  │  ├─ routes/             # places.ts, slots.ts, users.ts
│  │  ├─ controllers/        # placeController.ts, reviewController.ts, bookingController.ts
│  │  ├─ services/           # placeService.ts, reviewService.ts, bookingService.ts
│  │  └─ lib/ranking.ts      # pure scoring + sorting functions, no DB imports
│  └─ tests/                 # ranking.test.ts, booking.concurrency.test.ts, helpers
└─ client/
   └─ src/
      ├─ api/                # fetch wrapper (adds X-User-Id) + one function per endpoint
      ├─ hooks/              # useFetch (loading/error/data)
      ├─ context/            # CurrentUserContext (selected user, persisted in localStorage)
      ├─ components/         # UserSwitcher, PlaceCard, ReviewForm, ReviewList, SlotRow, ...
      ├─ pages/              # PlaceListPage, PlaceDetailPage
      └─ types.ts
```

### Responsibilities

- **Routes:** map method plus URL to a controller function. No logic.
- **Controllers:** read `req`, validate and parse input (types, ranges), call one service function, send `res.status().json()`. They never touch Prisma.
- **Services:** business rules and database access via Prisma, with no `req` or `res`. "Slot is full" and "place exists" live here. Testable on their own.
- **Database access:** call Prisma directly from services. **No repository layer.** Prisma is already a data-access layer; wrapping it for 5 models is the classic overengineering trap.
- **`lib/ranking.ts`:** pure functions, which makes the ranking unit test trivial and DB-free.

### Choices to defend

- **Validation:** small hand-rolled checks in controllers (integer, range, non-empty string), about 20 lines total. Zod is reasonable, but it is one more thing to learn in a 4-hour window.
- **Errors:** services throw `AppError` subclasses. One error-handling middleware turns them into JSON; unknown errors become a generic 500 with no stack trace. Controllers need no try/catch with **Express 5**, which forwards rejected promises from async handlers. With Express 4, an async throw hangs the request, so **verify** your installed major version.
- **Frontend routing:** `react-router-dom` for list and detail, so the detail page has a real URL. The one dependency I'd accept beyond React itself.
- **State:** plain `useState`/`useEffect` in a small `useFetch` hook, plus one React Context for the acting user. No Redux, no React Query.
- **Dev tooling:** `tsx` to run and watch the TypeScript server and seed, and `concurrently` at the root to run both dev servers in one command. Justified; everything else is not.
- **Types:** keep duplicate TypeScript types in client and server. A shared package is overengineering here; note the drift risk.

## 4. API design

All routes are under `/api`. JSON in, JSON out.

### The acting-as header

- **Frontend:** `UserSwitcher` stores the chosen id in `localStorage`, and the fetch wrapper adds `X-User-Id` to every request. On first load it calls `GET /api/users` and picks the stored id if still valid, otherwise the first user. Changing the user refetches the current page.
- **Backend `currentUser` middleware:** if the header is present, parse it and load the user from the DB. If malformed or the user doesn't exist, respond **401**. Otherwise set the user on the request.
- A `requireUser` guard on write routes returns **401** when no user is attached. Read routes work without a header, but include `myReview` when one is given.
- Typing `req.user` in TypeScript needs a declaration-merging snippet (a known beginner stumbling block), or use `res.locals`.
- State plainly in DECISIONS.md that this header is trivially spoofable and is not security.

### Endpoints

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/users` | none | `[{id, name}]` for the switcher |
| `GET /api/categories` | none | Distinct category strings for the filter, avoiding hardcoding in the UI |
| `GET /api/places?category=&sort=` | optional | List. `sort` is `top` (default) or `name`. Unknown `sort` returns 400. Unknown category returns an empty list. |
| `GET /api/places/:placeId` | optional | Detail with reviews, slots and `myReview` |
| `PUT /api/places/:placeId/review` | required | Create or update the acting user's review |
| `POST /api/slots/:slotId/bookings` | required | Book seats |

I chose `PUT` on a singular `/review` because "one per user per place" makes the review a single resource per (user, place), and `PUT` is naturally idempotent.

### Request and response shapes

**`GET /api/places`** returns `{ places: [{ id, name, category, description, openingHours, reviewCount, averageRating | null, score }] }`. The `score` is the rank score, useful to display or debug; clients should round it for display.

**`GET /api/places/:placeId`** returns `{ place: {id, name, category, description, openingHours, reviewCount, averageRating}, reviews: [{id, rating, body, createdAt, updatedAt, user: {id, name}}], slots: [{id, startsAt, capacity, seatsLeft}], myReview: {rating, body} | null }`. Reviews are newest first. It deliberately has no rank score, which saves the global-mean query. One combined endpoint keeps refetch-after-action to a single call.

**`PUT …/review`**

- Body: `{ rating: 1–5 integer, body: 1–500 chars trimmed }`
- Response: **200** with `{ review }` for both create and update.

**`POST …/bookings`**

- Body: `{ seats: integer ≥ 1 }`
- **201** with `{ booking: {id, slotId, seats, createdAt}, slot: {id, capacity, seatsLeft} }`. Returning `seatsLeft` lets the UI update immediately.

### Errors

Every error has the same shape: `{ error: { code, message } }`.

| Status | When | `code` |
| --- | --- | --- |
| 400 | Malformed id, rating out of range, empty text, `seats` not an integer ≥ 1, bad `sort` | `VALIDATION_ERROR` |
| 401 | Header missing on a write route, or present but not a real user | `UNAUTHENTICATED` |
| 404 | Place or slot does not exist | `NOT_FOUND` |
| 409 | Not enough seats | `SLOT_FULL` (0 left) or `NOT_ENOUGH_SEATS` (some left), both include `seatsLeft` |
| 500 | Anything unexpected | `INTERNAL_ERROR` |

409 fits "full" because the request is valid but conflicts with current state. The UI switches on `code`, not on parsing messages.

## 5. Ranking algorithm

### Recommendation: Bayesian (weighted) average

```
score = (v / (v + m)) · R  +  (m / (v + m)) · C
```

| Variable | Meaning | Value |
| --- | --- | --- |
| `R` | This place's mean rating | computed |
| `v` | This place's number of reviews | computed |
| `C` | Global mean over all reviews in the DB | computed (fallback 3.0 if there are no reviews at all) |
| `m` | Prior weight: how many reviews a place needs before its own average counts for 50% | constant, 10 |

Every place starts with `m` imaginary reviews at the global average, and real reviews gradually outvote them. The score is always between 1 and 5.

### Worked example (C = 4.0, m = 10)

| Place | v | R | Score |
| --- | --- | --- | --- |
| Museum | 312 | 4.7 | (312/322)·4.7 + (10/322)·4.0 = **4.678** |
| Market | 40 | 4.3 | (40/50)·4.3 + (10/50)·4.0 = **4.240** |
| Gallery | 3 | 4.8 | (3/13)·4.8 + (10/13)·4.0 = **4.185** |
| New café | 1 | 5.0 | (1/11)·5.0 + (10/11)·4.0 = **4.091** |
| No reviews | 0 | n/a | **4.000** (equals C) |

The café with one 5-star review drops below the museum, and the 3-review 4.8 place does not beat the well-evidenced 4.3 place. That ordering is the fix for the first bug.

### Few reviews

With v = 1 and m = 10, the place's own rating carries about 9% of the weight, so it can't jump the ranking on a single review. The shrinkage is symmetric: a single 1-star review also gets pulled up toward C, so one bad review doesn't bury a place either.

### Rejected alternatives

- **Plain average:** the bug.
- **`average × log(count)`:** unbounded, hard to explain, no principled meaning.
- **Wilson lower bound:** designed for binary up/down votes; needs an arbitrary conversion for 5-star ratings.
- **Fixed `C` (e.g. 3.5):** simpler, and avoids rank shifts when other reviews arrive, but ignores the data. Use the dynamic `C` and pass it in as a parameter so tests control it.

### Where it breaks

Say these in DECISIONS.md:

- `m = 10` is a judgment call, not a derived value.
- New genuinely great places are penalized until they accumulate reviews (cold start).
- Because `C` is computed from all reviews, adding one review can slightly reorder unrelated places.
- Because of the 3-user limit, live data never exceeds 3 reviews per place, so demo rankings are heavily dominated by `C`.
- It ignores recency and review spam.

### Implementation notes

- Compute `v` and `R` per place with a `groupBy` and `C` with one `aggregate`. Pass plain numbers to the pure function in `lib/ranking.ts`, then sort with a **deterministic comparator**: score descending, then review count descending, then name ascending.
- Sorting in app code is fine at this size. The requirement is "on the backend", not "in SQL". Mention the SQL alternative if the dataset grows.
- Do not round for sorting. Round only for display.

### Unit test cases

1. **The headline bug:** 1 review at 5.0 scores below 312 reviews at 4.7.
2. **A hand-computed exact value** (the 4.091 above), checked with `toBeCloseTo`.
3. **Zero reviews:** the score equals `C`.
4. **Convergence:** 10,000 reviews at 4.5 scores within 0.01 of 4.5.
5. **Symmetry:** with the same average above `C`, more reviews ranks higher; with the same average below `C`, more reviews ranks lower.
6. **Bounds:** scores stay within \[1, 5\] for extreme inputs (1 × 5.0, 1 × 1.0).
7. **Comparator:** ties are broken by count, then name; the order is stable and deterministic.

## 6. Concurrency-safe booking

### The race

Capacity 10, 9 booked. Requests A and B arrive together:

1. A reads "9 booked, 1 left". B reads "9 booked, 1 left".
2. A inserts and B inserts. Now 11 seats are booked, and both users got confirmations.

A common misconception is that wrapping read-then-insert in a transaction fixes this. It does not. At Postgres's default `READ COMMITTED` isolation, both transactions can read 9 before either commits. You need an atomic check-and-reserve.

### Recommended approach: one conditional `UPDATE` inside a transaction

Inside a Prisma interactive transaction (`$transaction(async tx => …)`):

1. Run a raw parameterized statement with `$executeRaw`: increase `booked_seats` by `n` where the slot id matches **and** `booked_seats + n <= capacity`. Check the **affected row count**.
2. If 0 rows were affected, the slot is full or lacks enough seats. Read the slot for the message, then throw `SlotFull` / `NotEnoughSeats`. If the slot doesn't exist at all, throw `NotFound`.
3. If 1 row was affected, insert the Booking row in the same transaction.
4. Commit.

### Why it's safe

Postgres takes a row lock when a transaction updates the slot row, held until commit or rollback. A concurrent `UPDATE` on the same row **waits**. When the lock is released, Postgres re-evaluates the `WHERE` clause against the newly committed row version in `READ COMMITTED`. So the second request sees the updated `booked_seats`, and the condition fails if there is no room. Bookings for one slot serialize automatically, while other slots are unaffected. There are no explicit locks to manage, no retry loop, and no application-level mutex (which would break with more than one server process).

The CHECK constraint (`booked_seats <= capacity`) is a second, independent barrier. Even a bug in your SQL could not commit an overbooked slot.

### Rollback behavior

If anything throws inside the transaction callback, Prisma rolls back everything: the counter increment, the booking insert, and the lock release. Without the transaction, a failed insert after a successful counter update would permanently leak seats, so the transaction is essential for that reason. The 409 path changes nothing, but throwing still ends the transaction cleanly.

### Alternatives (brief)

- **`SELECT … FOR UPDATE`, then sum, then insert:** also correct. Single source of truth, but three statements and the lock held across them.
- **`SERIALIZABLE` isolation plus retry on serialization failures:** correct, but you must implement retry logic, and clients may see failures that aren't "full".
- **Advisory locks:** correct, but more obscure than you need.
- **In-memory mutex in Node:** only works for one process; not a real solution.

### Prisma details to verify

- Prisma's `updateMany` can't express `booked_seats + n <= capacity` directly. A pure-Prisma variant is to read the immutable `capacity` first and use `where: { bookedSeats: { lte: capacity − n } }`. That works only because capacity never changes. I prefer the raw statement because its correctness doesn't depend on that unstated assumption.
- Interactive transactions have a default `maxWait` (about 2s) and `timeout` (about 5s), and the connection pool has a default size tied to CPU count. If many parallel requests wait for a connection or the row lock, you can get transaction timeouts that look like random 500s. See the test notes below.
- Deadlocks are unlikely because each transaction locks one slot row. Your test should confirm that rather than you assuming it.

### Parallel integration test

Using Supertest against the `app` object (hence the app/server split):

1. Create test data: a user (or three), a place, a slot with capacity 10, and `bookedSeats = 8` **with a matching Booking row of 8 seats**, so the invariant holds from the start.
2. Fire **20 simultaneous** `POST` requests for 1 seat each with `Promise.all`, rotating among the user ids.
3. Assert:
   - Every response is 201 or 409. **Zero 500s**, which also catches pool or timeout problems.
   - Exactly 2 responses are 201 and 18 are 409 with code `SLOT_FULL`.
   - In the DB, `bookedSeats == capacity` and `SUM(booking.seats) == capacity`.
4. Second scenario: 3 seats left, 10 requests for 2 seats each. Exactly one succeeds, and the rest return `NOT_ENOUGH_SEATS`. This tests mixed sizes and the counter invariant.
5. Optional third scenario: a rejected booking leaves `bookedSeats` unchanged.

**The "fails before, passes after" evidence the assignment loves:** write the *naive* read-then-insert implementation first and commit it. Then write the test and commit it, and confirm it fails. Then commit the atomic fix and confirm the test passes. The naive version may pass by luck, because races are probabilistic. If it does, raise the request count, and for the demonstration add a short artificial delay between read and write (don't commit the delay into the final code). Your git history will tell this story clearly.

### Test-environment considerations

- Use **real PostgreSQL**. SQLite and mocks cannot demonstrate row-lock behavior.
- Use a **separate test database**: `wayfarer_test` (while development uses `wayfarer`).
- Have the test script refuse to run if `TEST_DATABASE_URL` is missing or doesn't point to `wayfarer_test`, because test cleanup deletes data.
- Run `prisma migrate deploy` in a Vitest `globalSetup`. Truncate tables before each test.
- DB-backed test files should not run in parallel with each other. Check your Vitest version's option (`fileParallelism: false` in recent versions).
- Raise the Prisma connection limit via the URL (for example 10–20), or keep the test at about 20 requests.
- `npm test` at the root runs both tests, and the README states that Postgres must already be up.

## 7. Vertical implementation plan

Order by dependency and risk. The two highest-risk, highest-weight items (booking safety, ranking) come before the UI.

| # | Feature | Done means | Key commits |
| --- | --- | --- | --- |
| **F0** | **Walking skeleton:** git init, `.gitignore`, workspaces, Prisma schema + migration with CHECKs, Express `app`/`server` split, `GET /api/users`, Vite client with proxy and `UserSwitcher` | Setup works on local PostgreSQL. Switcher shows 3 real DB users. | chore: setup, feat: schema, feat: users endpoint |
| **F1** | **Booking backend + parallel test** (naive first, then fix). Includes `currentUser` middleware, error handler, `POST /slots/:id/bookings`. | The parallel test fails on the naive version and passes on the atomic one. Invariants hold. | test: parallel booking (failing), fix: atomic booking |
| **F2** | **Ranking function + unit test** | All section 5 cases pass. The function is pure and not wired to the DB yet. | feat: ranking, test: ranking |
| **F3** | **Seed + places list end to end:** seed (3 users, \~10 places, reviews, slots including near-full and full), categories, `GET /places` with filter and sort, list UI | Filter and sort in the UI change the order from the backend. The 1-review place ranks below others. | feat: seed, feat: places API, feat: list page |
| **F4** | **Detail page + reviews:** detail endpoint, `PUT review`, review form prefilled with `myReview`, review list | Reviewing twice results in one updated review. Switching users shows that user's own review. | feat: detail, feat: review upsert |
| **F5** | **Booking UI:** slot rows with seats left, seats input, booking, clear full/not-enough message, button disabled while pending | Booking changes seats left. A full slot shows a readable message, not an error page. | feat: booking UI |
| **F6** | **Hardening and docs:** loading and error states everywhere, README, DECISIONS.md, AI\_USAGE.md, fresh-clone dry run | Everything runs from a fresh clone in a temp directory exactly as the README says. | docs: ..., fix: ... |

Write DECISIONS.md incrementally. Append each decision in the commit where you make it, not at the end. Do the same with AI\_USAGE.md notes.

## 8. Time management

4.5 hours, with a 30-minute stretch if you have 5.

| Time | Block | Notes |
| --- | --- | --- |
| 0:00–0:35 | F0 | Expect Prisma and Postgres connection surprises. Don't polish. |
| 0:35–1:25 | F1 | Test-first, naive implementation first. The most valuable 50 minutes. |
| 1:25–1:45 | F2 | Pure function, so it should be quick. |
| 1:45–2:30 | F3 | Seed script and the first real UI. |
| 2:30–3:15 | F4 |  |
| 3:15–3:50 | F5 |  |
| 3:50–4:20 | F6 | Includes a 10–15 minute fresh-clone dry run. |
| 4:20–4:30 | Buffer | Use any extra 30 minutes for Prisma and setup surprises, not new features. |

### Never cut

- The ranking test and the parallel booking test
- Atomic booking, plus the clear "full" message
- DECISIONS.md, the README, and an honest AI\_USAGE.md
- Small commits

### Cut in this order if time runs short

1. Styling polish and category-index or opening-hours niceties
2. The `sort=name` option (keep only `top`)
3. The optional third booking test and the extra review-upsert integration test
4. `GET /api/categories`, replaced by a hardcoded list (note it as a known limitation)
5. The `myReview` prefill (the form starts empty with a note that submitting updates your review)
6. Hand-written CHECK constraints in the migration (keep the code-level guard, and say you'd add them)

Write "what I didn't finish and how I'd do it" in DECISIONS.md; the assignment says this impresses reviewers. I'd not attempt any bonus. If you finish early, double-click safety needs an idempotency key and is a design discussion in itself, while a mobile layout is cheap with Tailwind. Choose only after A–D are solid.

## 9. Technical risks

1. **Prisma major version drift.** If you install Prisma 7, setup differs from most tutorials I know (a `prisma.config.ts`, an explicit database driver adapter, no automatic `.env` loading). **Verify** against the docs for the version you install, and pin the version in `package.json`. Don't mix tutorials from different majors.
2. **Prisma transaction limits under parallel load** (timeouts and pool size, see section 6). If the parallel test shows random 500s, suspect this before suspecting your SQL.
3. **Raw SQL naming.** Prisma's default table and column names are case-sensitive and need quoting. Use `@@map`/`@map` snake\_case to avoid this.
4. **CHECK constraints need a hand-edited migration**, and a later `db pull` or `db push` could discard them. Stick to migrations.
5. **Express async errors:** Express 4 silently hangs on rejected promises (see section 3). Check your version.
6. **Tailwind setup differs by major** (v4's Vite plugin vs. v3's PostCSS config). Follow only the current official install guide for the version you install.
7. **TypeScript and module setup:** ESM vs. CommonJS mismatches between `tsx`, Vitest and Prisma-generated imports are the most common time sink. Pick one setup in F0 and don't change it.
8. **The review-upsert first-insert race** (section 2). Low severity, since the unique constraint protects integrity, but verify the behavior.
9. **Local PostgreSQL assumptions:** Local PostgreSQL service must be running with `wayfarer` and `wayfarer_test` databases created, and `.env` doesn't exist on a clone. Commit `.env.example` and have the setup script create `.env` if missing, using a small Node script so it works on Windows. Add `.nvmrc` or an `engines` field for the Node version.
10. **Seed idempotency:** the seed should clear tables in child-first order so it can be rerun. Slot times must be relative to the seed run, or the demo data goes stale.
11. **Test isolation:** tests that delete data must never run against the dev database (section 6 safeguards).
12. **The "fails before the fix" demonstration may not fail by luck.** See the mitigation in section 6.
13. **The 3-user review cap** (section 1). Decide it explicitly, not by accident.
14. **Non-risks worth stating honestly:** the `X-User-Id` header is not secure and doesn't pretend to be, and seats-left staleness is handled by the 409 path, not by real-time updates.

**Disclosure reminder:** this planning conversation is AI usage. Put it in AI\_USAGE.md, along with one concrete moment where you caught a mistake or checked an AI suggestion. Note these as they happen, not afterwards.
