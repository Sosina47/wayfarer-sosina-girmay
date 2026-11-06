# Wayfarer

> **Honest ratings, fair bookings.**

Wayfarer is a full-stack web application designed for exploring Lisbon's iconic landmarks, reading authentic community feedback, writing reviews, and reserving seats on guided tours with robust concurrency safeguards that prevent overbooking.

---

## Project Overview

### The Problems Wayfarer Solves

1. **The "Single 5-Star Review" Ranking Problem**: Traditional arithmetic averages allow newly added attractions with a single 5.0 rating to leap above renowned cultural landmarks that maintain a 4.8 average across hundreds of reviews. Wayfarer solves this by implementing a Bayesian weighted-average ranking formula ($m = 10$) that stabilizes rankings against sparse data.
2. **Concurrent Tour Overbooking**: When multiple travellers attempt to book the last available seats simultaneously, standard read-then-write logic creates race conditions where slots exceed capacity or database transactions fail with unhandled errors. Wayfarer guarantees atomic seat reservations through conditional database updates and row-level serialization in PostgreSQL.
3. **Frictionless Identity Switching**: Wayfarer provides an "acting-as" identity switcher (Ana, Bruno, and Carla) without password or authentication barriers, allowing immediate evaluation of multi-user reviews, review update idempotence, and booking states.

### Key Features

- **Explore Lisbon**: Discover 10 curated Lisbon landmarks with real photography, categories, opening hours, and addresses.
- **Category Filtering**: Filter places by *Food & Drink*, *History*, *Museums*, *Neighbourhoods*, and *Viewpoints*.
- **Intelligent Sorting**: Sort attractions by **Top rated** (Bayesian weighted score) or alphabetically by **Name (A–Z)** with deterministic tie-breaking.
- **Place Details & Hero Media**: High-resolution, uncropped photographs with responsive aspect ratio handling and styled architectural placeholders.
- **Single-Review-per-User Invariant**: Submit a rating (1–5 stars) and review text (1–500 characters). Subsequent reviews by the same user automatically update their previous review in-place via atomic database upsert.
- **Real-Time Guided Tours**: View upcoming departures, capacity, and remaining seats. Dynamic UI badges alert users when tours have *"Only X seats left"* or are *"Fully booked"*.
- **Concurrency-Safe Seat Reservation**: Book between 1 and 10 seats per transaction with immediate feedback, zero overbooking, and automatic rollback on conflicts.

### Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7
- **Backend**: Node.js (>=22), Express 5, TypeScript (`tsx`)
- **Database & ORM**: PostgreSQL 18, Prisma ORM 6
- **Testing**: Vitest 5, Supertest 7
- **Monorepo**: Native npm workspaces (`client`, `server`)

---

## Screenshots

### 1. Explore Lisbon — Top-Rated Discovery View
Places ordered by Bayesian weighted score, featuring category filter buttons, real Lisbon photography, star ratings, and the acting user header. Note that *Pastelaria Brilho* (1 review, 5.0★) is properly stabilized below venues with multiple high ratings.

![Explore Lisbon — Top-Rated Discovery View](client/public/images/screenshots/Screenshot%202026-11-06%20031749.png)

### 2. Alphabetical Sorting (A–Z)
Deterministic sorting by landmark name, demonstrating smooth catalog navigation across categories.

![Alphabetical Sorting (A–Z)](client/public/images/screenshots/Screenshot%202026-11-06%20032309.png)

### 3. Acting-As User Switcher
The identity selector in the top-right navigation bar enables instant switching between seeded user personas (Ana, Bruno, and Carla) without authentication friction.

![Acting-As User Switcher](client/public/images/screenshots/Screenshot%202026-11-06%20032351.png)

### 4. Place Details & Guided Tour Booking
The details view for Jerónimos Monastery, displaying uncropped photography, operating hours, address, Bayesian aggregate rating, and upcoming tour slots with live availability.

![Place Details & Guided Tour Booking](client/public/images/screenshots/Screenshot%202026-11-06%20032020.png)

### 5. Tour Capacity 
The tour booking sidebar showing capacity threshold indicators, including urgency warnings (*"Only 2 seats left"*) and disabled sold-out states (*"Fully booked"*).

![Tour Capacity & Urgency States](client/public/images/screenshots/Screenshot%202026-11-06%20032724.png)

### 6. Traveller Reviews & In-Place Editing
Community reviews list and the interactive review submission form. When an acting user has already reviewed a place, the form automatically transitions to *"Editing existing review"* mode.

![Traveller Reviews & In-Place Editing](client/public/images/screenshots/Screenshot%202026-11-06%20032119.png)

---

## Prerequisites

Before setting up Wayfarer, ensure the following software is installed on your workstation:

1. **Node.js**: `v22.x` LTS or `v24.x` (check with `node -v`).
2. **npm**: `v10.x` or newer (included with Node.js; check with `npm -v`).
3. **PostgreSQL 18**: Installed and running locally on port `5432`.
   - Requires two databases:
     - `wayfarer` (for development and seeding)
     - `wayfarer_test` (for the automated test suite)

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sosina47/wayfarer-sosina-girmay.git
cd wayfarer-sosina-girmay
```

### 2. Install Dependencies

Install all monorepo dependencies across the root, client, and server workspaces:

```bash
npm install
```

### 3. Configure Environment Variables

Run the automated setup script:

```bash
npm run setup
```

This script copies `server/.env.example` to `server/.env` (if not already present) and generates the Prisma client.

Open `server/.env` and update the PostgreSQL connection URLs with your local credentials:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/wayfarer"
TEST_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/wayfarer_test"
```

> **Security Note**: `TEST_DATABASE_URL` must point to `wayfarer_test` and must never match `DATABASE_URL`. A built-in runtime guard aborts test execution if these point to the same database.

### 4. Create Local PostgreSQL Databases

If not already created, create both databases in PostgreSQL:

```sql
CREATE DATABASE wayfarer;
CREATE DATABASE wayfarer_test;
```

### 5. Run Database Migrations

Apply the Prisma migrations to create tables and database-level `CHECK` constraints:

```bash
npm run db:migrate
```

### 6. Seed the Database

Populate the `wayfarer` development database with initial Lisbon landmarks, users, reviews, and tour departures:

```bash
npm run db:seed
```

The seed script creates:
- 3 users (Ana, Bruno, Carla)
- 10 curated Lisbon places (all mapped to local photography)
- 23 synthetic demonstration reviews (global mean $C = 4.000$)
- 5 tour slots with predictable future departure times
- 6 initial bookings while verifying invariant consistency

---

## Running the Application

### Development Mode

Start both the backend API server and frontend Vite development server concurrently:

```bash
npm run dev
```

You can also run them independently in separate terminals:
- **Backend API**: `npm run dev:server` (listens on `http://localhost:3001`)
- **Frontend Client**: `npm run dev:client` (listens on `http://localhost:5173`)

### Accessing Wayfarer

- **Frontend Application**: Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite dev server automatically proxies all `/api/*` calls to port `3001`.
- **Backend API Health Check**: Visit [http://localhost:3001/api/health](http://localhost:3001/api/health) to inspect server status and PostgreSQL connectivity.

---

## Running Tests and Quality Checks

Wayfarer includes comprehensive unit tests, database-backed integration tests, concurrency race-condition suites, TypeScript type checks, and production build checks:

| Command | Purpose | Scope |
|---|---|---|
| `npm test` | Runs the automated test suite with Vitest | Executes all 8 test suites (64 tests) against `wayfarer_test` |
| `npm run typecheck` | Validates TypeScript strict mode | Runs `tsc --noEmit` on `server` and `tsc -b` on `client` |
| `npm run build` | Compiles frontend for production | Generates optimized production assets in `client/dist` |
| `npm run verify` | Full quality gate | Runs `typecheck` and `build` sequentially |

---

## Known Limitations

- **Simulated Identity**: The `X-User-Id` header simulates user identity for review and booking flows. It is intentionally designed for demonstration and evaluation without authentication friction, rather than production authorization.
- **Booking Cancellations**: Ticket reservations are final in this release; cancellation and seat re-allocation endpoints are not implemented.
- **Polling vs. WebSockets**: Remaining tour seats update upon user interactions (navigation, filter changes, or booking attempts). Live push updates via WebSockets or Server-Sent Events are not implemented; race conditions on stale UI states are cleanly handled by HTTP 409 conflict responses.
- **Review Deletion**: Users can update their review rating and text at any time, but deleting a review is not exposed in the interface.
- **Geographic Scope**: Curated specifically for Lisbon landmarks.
