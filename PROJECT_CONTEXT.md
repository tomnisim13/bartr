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
│   ├── src/server.ts      # Express API server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example       # Supabase credentials template
├── frontend/
│   ├── App.tsx             # Main app component
│   ├── app.json            # Expo config
│   ├── index.ts            # Entry point
│   └── package.json
├── .githooks/
│   └── pre-commit          # Context sync reminder
├── PROJECT_CONTEXT.md      # This file (source of truth)
├── README.md
├── .nvmrc                  # Node 22
└── .gitignore
```

## Current Status

- [x] Walking Skeleton (end-to-end: button → API → Supabase)
- [x] Backend: Express server with POST /items endpoint
- [x] Frontend: Expo app with test button
- [x] Supabase: items table with RLS policy
- [x] Git repo initialized, pushed to github.com/tomnisim13/bartr
- [ ] User authentication (Supabase Auth)
- [ ] Item listing with photos
- [ ] Swipe UI (Tinder-like cards)
- [ ] Matching engine (double-coincidence)
- [ ] Points/valuation system
- [ ] Chat between matched users
- [ ] QR code verification for handovers
- [ ] Push notifications
