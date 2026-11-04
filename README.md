# Wayfarer

> **Honest ratings, fair bookings.**

Wayfarer is a full-stack web application for discovering places in Lisbon, reading and writing traveller reviews, and booking seats on guided tours without overbooking risks.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend**: Node.js, Express 5, TypeScript (`tsx`)
- **Database & ORM**: PostgreSQL 18 (local), Prisma ORM
- **Testing**: Vitest, Supertest
- **Monorepo**: npm workspaces (`client`, `server`)

---

## Prerequisites

1. **Node.js**: v22 LTS or v24 (see `.nvmrc`)
2. **Local PostgreSQL 18**: Running on `localhost:5432` with two databases created:
   - `wayfarer` (development)
   - `wayfarer_test` (automated tests)

---

## Getting Started

### 1. Setup & Installation

Run the automated setup script to install dependencies, generate `.env` from `.env.example`, and generate the Prisma Client:

```bash
npm run setup
```

*Note: Update `server/.env` with your local PostgreSQL credentials if your user or password differs from the placeholder.*

### 2. Start Development

Start both the Express API server (port `3001`) and Vite dev server (port `5173`) with a single command:

```bash
npm run dev
```

Visit the frontend at [http://localhost:5173](http://localhost:5173).

---

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run setup` | Copies `.env.example` to `server/.env` and generates the Prisma client |
| `npm run dev` | Runs Express API and Vite dev servers concurrently |
| `npm run typecheck` | Runs TypeScript compiler checks on both server and client |
| `npm run build` | Builds client production bundle |
| `npm run test` | Runs the test suite |
| `npm run verify` | Full quality gate: runs `typecheck` and `build` |

---

## Architecture & Project Structure

```text
wayfarer-sosina-girmay/
├── client/                     # Vite + React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx             # Application root & health check
│   │   ├── index.css           # Tailwind v4 theme & color tokens
│   │   └── main.tsx            # React DOM entrypoint
│   ├── vite.config.ts          # Vite configuration with /api proxy
│   └── package.json
├── server/                     # Express 5 + Prisma backend
│   ├── prisma/
│   │   └── schema.prisma       # Prisma datasource & models
│   ├── src/
│   │   ├── app.ts              # Express application factory (unbound)
│   │   ├── server.ts           # HTTP server listener (port 3001)
│   │   ├── routes/health.ts    # GET /api/health (with DB check)
│   │   └── lib/                # Prisma & env loaders
│   ├── .env.example
│   └── package.json
├── scripts/setup.mjs           # Cross-platform setup script
├── DEVELOPMENT_PLAN.md         # Primary source of truth & vertical plan
├── DECISIONS.md                # Architectural decisions & rejected alternatives
├── AI_USAGE.md                 # AI usage record
└── package.json                # Root monorepo workspace configuration
```

---

## Test Isolation & Safety

The automated test suite runs against the dedicated local database `wayfarer_test`. A runtime guard (`assertTestDatabase`) validates `TEST_DATABASE_URL` before any database connection is attempted. If `TEST_DATABASE_URL` is missing, unparseable, or equals `DATABASE_URL`, tests abort immediately without touching any database.

---

## Disclaimers & Limitations

- **Demo Identity**: The `X-User-Id` header simulates user switching for demonstration purposes and is intentionally not a secure authentication mechanism.
- **Synthetic Data**: All places are real Lisbon locations; all reviews and tour slots are synthetic demonstration data.

