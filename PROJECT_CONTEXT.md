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
│   │   ├── config.ts            # Numeric enums + SRID_WGS84 + runtime config
│   │   ├── constants.ts         # DEMO_USER_ID, POSTGRES_UNIQUE_VIOLATION
│   │   ├── routes/
│   │   │   ├── feed.ts          # GET  /v1/feed              (geo-filtered)
│   │   │   ├── interactions.ts  # POST /v1/interactions
│   │   │   ├── items.ts         # POST /items
│   │   │   ├── users.ts         # GET/POST /v1/users/location
│   │   │   └── dev.ts           # DELETE /v1/dev/clear        (DEV only)
│   │   ├── validation/
│   │   │   ├── location.ts      # parseLatLng (lat/lng range + finite checks)
│   │   │   └── postgisPoint.ts  # parsePostgisPoint (WKT + Supabase EWKB hex)
│   │   └── __tests__/           # vitest + supertest suites (31 tests)
│   ├── sql/                     # Migrations (002, 003, 004_geolocation.sql)
│   ├── vitest.config.ts         # fileParallelism: false (shared Supabase DB)
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example             # Supabase credentials template
├── frontend/
│   ├── App.tsx                  # Root component
│   ├── app.json                 # Expo config
│   ├── index.ts                 # Entry point
│   ├── src/
│   │   ├── api.ts               # Backend HTTP client
│   │   ├── config.ts            # Numeric enums + SRID_WGS84 + runtime config
│   │   ├── types.ts             # Shared types (Item, distance_km)
│   │   ├── logger.ts            # Structured console wrapper
│   │   ├── itemImages.ts        # Local image registry
│   │   ├── screens/
│   │   │   ├── SwipeScreen.tsx           # Thin orchestrator (uses hooks)
│   │   │   └── LocationDeniedScreen.tsx  # Blocking screen + Open Settings
│   │   ├── hooks/
│   │   │   ├── useFeed.ts       # Feed loading + swipe recording
│   │   │   ├── useClearAll.ts   # DEV clear-all workflow
│   │   │   └── useLocation.ts   # Permission + GPS + last-location fallback
│   │   └── components/
│   │       ├── ItemCard.tsx     # Includes distance badge
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
- **Numeric enums & strict constants** — `ItemStatus` (`AVAILABLE=1`, `TRADED=2`, `ARCHIVED=3`) and `InteractionType` (`DISLIKE=0`, `LIKE=1`) are the only allowed values for `items.status` and `interactions.type` in code, tests, and types. No raw `1` / `3` literals — always reference the enum. `SRID_WGS84 = 4326` is referenced by name from the PostGIS migration. Defined in both `backend/src/config.ts` and `frontend/src/config.ts` (single shared package is a future improvement).
- **Structured logging** — All backend critical paths (request entry, DB success/failure, validation rejections, unexpected errors) log via `pino` with a context object: `logger.info({ userId, count }, 'Feed served')`. In production (`NODE_ENV=production`) logs are JSON; in dev they go through `pino-pretty`. Frontend uses a thin `logger` wrapper around `console` (`frontend/src/logger.ts`) that emits structured records — never use bare `catch {}`; always log the error.
- **SRP** — One responsibility per module. Routes live under `routes/<resource>.ts`. Validators live under `validation/<concern>.ts`. Express handlers do request parsing → validation → repository call → log → respond, and nothing else. Frontend screens are thin orchestrators; data/effect logic lives in hooks under `src/hooks/`. Hooks are decomposed into named single-purpose async helpers (e.g. `useLocation` → `isPermissionGranted` / `fetchInitialCoords` / `fetchLastStoredCoords` / `postCoordsSafely` / `subscribeToMovement`).
- **Testing** — Backend tests run serially (`fileParallelism: false`) because they share one Supabase DB and the hardcoded `DEMO_USER_ID`. Each `describe` cleans its own seeded rows.

## Current Status

- [x] Walking Skeleton (end-to-end: button → API → Supabase)
- [x] Backend: Express server with POST /items endpoint
- [x] Frontend: Expo app with test button
- [x] Supabase: items table with RLS policy
- [x] Git repo initialized, pushed to github.com/tomnisim13/bartr
- [x] Swipe UI (Tinder-like cards) — `react-native-deck-swiper`, info modal, empty state, prefetch
- [x] Backend feed endpoint (`GET /v1/feed`) with DB-level filtering via `get_feed` RPC
- [x] Interactions endpoint (`POST /v1/interactions`) with 409 duplicate handling
- [x] Structured logging (`pino` backend, console wrapper frontend)
- [x] DEV `/v1/dev/clear` endpoint + Clear-All button for fresh-start during development
- [x] **Geo-location filtering** — PostGIS `user_locations` table, GIST index, geo-aware `get_feed` RPC with `ST_DWithin` + `distance_km`
- [x] `POST /v1/users/location` (upsert) and `GET /v1/users/location` (last-known fallback) endpoints
- [x] `useLocation` hook with 4-state status (`pending` / `granted` / `fallback` / `denied`), `watchPositionAsync` threshold sync, AppState re-bootstrap
- [x] `LocationDeniedScreen` with "Open Settings" deep link
- [x] Distance badge on item cards (`distance_km` rounded to 1 decimal)
- [x] Backend test suite — **31 tests** across feed / interactions / validation / errors / feed-geo / users-location / postgisPoint
- [ ] User authentication (Supabase Auth) — currently hardcoded `DEMO_USER_ID`
- [ ] Item listing with photos (upload UI)
- [ ] Request-correlation IDs in backend logs (`pino-http`)
- [ ] Shared package for `ItemStatus` / `InteractionType` / `config.location` (currently duplicated backend ↔ frontend)
- [ ] Frontend hook unit tests (`useLocation`, `useFeed`) — needs `@testing-library/react-native`
- [ ] Matching engine (double-coincidence)
- [ ] Points/valuation system
- [ ] Chat between matched users
- [ ] QR code verification for handovers
- [ ] Push notifications
