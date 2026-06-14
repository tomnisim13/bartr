# Bartr — Project Context

## Overview
Bartr is a Tinder-like mobile app for non-monetary trades. Users swipe on items they want, and the system matches them for barter exchanges — no money involved.

## Tech Stack
- **Frontend**: Expo (React Native) with TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Runtime**: Node 22 (see `.nvmrc`)

## System Architecture

```
┌─────────────────┐       HTTP/REST       ┌─────────────────┐       SQL/REST        ┌─────────────────┐
│                 │ ───────────────────▶  │                 │ ───────────────────▶  │                 │
│   Expo App      │                       │  Express API    │                       │    Supabase     │
│   (Mobile/Web)  │ ◀───────────────────  │  (port 3000)   │ ◀───────────────────  │   (PostgreSQL)  │
│                 │       JSON             │                 │       JSON             │                 │
└─────────────────┘                       └─────────────────┘                       └─────────────────┘
```

## Core Features & Workflow

### Points System
Each item is assigned a point value. Trades happen when users find items of equivalent value or agree to point-balanced swaps.

### AI Dynamic Valuation
An AI model estimates item value based on photos, description, condition, and market data to assign fair point values.

### Double-Coincidence Logic
The matching engine solves the double-coincidence-of-wants problem — finding chains or cycles of trades when direct swaps aren't possible.

### QR Barcode Verification
Physical handovers are confirmed via QR code scanning — both parties scan to mark the trade as complete.

## Project Structure

```
bartr/
├── backend/
│   ├── src/
│   │   ├── server.ts            # Process entry — listens on :3000
│   │   ├── app.ts               # Express assembler (middleware + mounts routers)
│   │   ├── loadEnv.ts           # Side-effect: dotenv.config(); imported first
│   │   ├── supabase.ts          # Supabase client (single source)
│   │   ├── logger.ts            # pino logger (pretty in dev, JSON in prod)
│   │   ├── config.ts            # Numeric enums + runtime config
│   │   ├── constants.ts         # DEMO_USER_ID, POSTGRES_UNIQUE_VIOLATION
│   │   ├── routes/
│   │   │   ├── feed.ts          # GET  /v1/feed
│   │   │   ├── interactions.ts  # POST /v1/interactions
│   │   │   ├── items.ts         # POST /items
│   │   │   └── dev.ts           # DELETE /v1/dev/clear  (DEV only)
│   │   └── __tests__/           # vitest + supertest suites
│   ├── sql/                     # Migrations (002_core_swiping.sql, ...)
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example             # Supabase credentials template
├── frontend/
│   ├── App.tsx                  # Root component
│   ├── app.json                 # Expo config
│   ├── index.ts                 # Entry point
│   ├── src/
│   │   ├── api.ts               # Backend HTTP client
│   │   ├── config.ts            # Numeric enums + runtime config
│   │   ├── types.ts             # Shared types (Item)
│   │   ├── logger.ts            # Structured console wrapper
│   │   ├── itemImages.ts        # Local image registry
│   │   ├── screens/
│   │   │   └── SwipeScreen.tsx  # Thin orchestrator (uses hooks)
│   │   ├── hooks/
│   │   │   ├── useFeed.ts       # Feed loading + swipe recording
│   │   │   └── useClearAll.ts   # DEV clear-all workflow
│   │   └── components/
│   │       ├── ItemCard.tsx
│   │       ├── ItemImage.tsx    # Local / remote / placeholder resolver
│   │       ├── DetailModal.tsx
│   │       ├── EmptyState.tsx
│   │       └── ClearAllButton.tsx
│   └── package.json
├── .githooks/
│   └── pre-commit               # Context sync reminder
├── ARCHITECTURE.md
├── PROJECT_CONTEXT.md           # This file (source of truth)
├── README.md
├── .nvmrc                       # Node 22
└── .gitignore
```

## Conventions

- **DEV** — Comments/code marked with `DEV` are temporary development tools, dummy data, or placeholder logic. These must be removed or replaced before production release.
- **Numeric enums** — `ItemStatus` (`AVAILABLE=1`, `TRADED=2`, `ARCHIVED=3`) and `InteractionType` (`DISLIKE=0`, `LIKE=1`) are the only allowed values for `items.status` and `interactions.type` in code, tests, and types. No raw `1` / `3` literals — always reference the enum. Defined in both `backend/src/config.ts` and `frontend/src/config.ts` (single shared package is a future improvement).
- **Structured logging** — All backend critical paths (request entry, DB success/failure, validation rejections, unexpected errors) log via `pino` with a context object: `logger.info({ userId, count }, 'Feed served')`. In production (`NODE_ENV=production`) logs are JSON; in dev they go through `pino-pretty`. Frontend uses a thin `logger` wrapper around `console` (`frontend/src/logger.ts`) that emits structured records — never use bare `catch {}`; always log the error.
- **SRP** — One responsibility per module. Routes live under `routes/<resource>.ts`. Express handlers do request parsing → validation → repository call → log → respond, and nothing else. Frontend screens are thin orchestrators; data/effect logic lives in hooks under `src/hooks/`.

## Current Status

- [x] Walking Skeleton (end-to-end: button → API → Supabase)
- [x] Backend: Express server with POST /items endpoint
- [x] Frontend: Expo app with test button
- [x] Supabase: items table with RLS policy
- [x] Git repo initialized, pushed to github.com/tomnisim13/bartr
- [x] Swipe UI (Tinder-like cards) — `react-native-deck-swiper`, info modal, empty state, prefetch
- [x] Backend feed endpoint (`GET /v1/feed`) with DB-level filtering via `get_feed` RPC
- [x] Interactions endpoint (`POST /v1/interactions`) with 409 duplicate handling
- [x] Backend test suite (vitest + supertest, 11 tests across feed / interactions / validation / errors)
- [x] Structured logging (`pino` backend, console wrapper frontend)
- [x] DEV `/v1/dev/clear` endpoint + Clear-All button for fresh-start during development
- [ ] User authentication (Supabase Auth) — currently hardcoded `DEMO_USER_ID`
- [ ] Item listing with photos (upload UI)
- [ ] Request-correlation IDs in backend logs (`pino-http`)
- [ ] Shared package for `ItemStatus` / `InteractionType` (currently duplicated)
- [ ] Matching engine (double-coincidence)
- [ ] Points/valuation system
- [ ] Chat between matched users
- [ ] QR code verification for handovers
- [ ] Push notifications
