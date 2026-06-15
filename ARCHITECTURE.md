# Bartr — Architecture

## Core Architecture

```
┌─────────────────┐       HTTP/REST       ┌─────────────────┐       PostgREST       ┌─────────────────┐
│   Expo App      │ ───────────────────▶  │  Express API    │ ───────────────────▶  │    Supabase     │
│   (React Native)│                       │  /v1/*          │                       │   (PostgreSQL)  │
│                 │ ◀───────────────────  │  port 3000      │ ◀───────────────────  │                 │
└─────────────────┘       JSON            └─────────────────┘       JSON            └─────────────────┘
```

### Tech Stack
- **Frontend**: Expo SDK 56, React Native 0.85, TypeScript
- **Backend**: Node.js 22, Express 5, TypeScript (tsx)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Shared**: Numeric enums for status codes, centralized config
- **Logging**: `pino` (backend, JSON in prod / pretty in dev), thin structured `console` wrapper (frontend)
- **Testing**: `vitest` + `supertest` (backend integration tests)

---

## Backend Module Layout

```
backend/src/
├── server.ts          # Process entry — listens on :3000
├── app.ts             # Express assembler — middleware + mounts routers
├── loadEnv.ts         # Side-effect dotenv.config(); imported first by app.ts
├── supabase.ts        # Supabase client (single source)
├── logger.ts          # pino logger; pino-pretty gated on NODE_ENV !== 'production'
├── config.ts          # Numeric enums (ItemStatus, InteractionType) + runtime config
├── constants.ts       # DEMO_USER_ID, POSTGRES_UNIQUE_VIOLATION ('23505')
├── routes/
│   ├── feed.ts            # GET    /v1/feed
│   ├── interactions.ts    # POST   /v1/interactions
│   ├── items.ts           # POST   /items
│   └── dev.ts             # DELETE /v1/dev/clear   (DEV only)
└── __tests__/         # vitest + supertest suites
```

Each route handler follows the same shape: parse → validate (using enums) → DB call → `logger.info/warn/error` → respond. Postgres-specific error mapping (e.g. `23505 → 409`) is done explicitly via the named constant.

## Frontend Module Layout

```
frontend/src/
├── api.ts             # Backend HTTP client (fetchFeed, postInteraction, clearAllInteractions)
├── config.ts          # Numeric enums + runtime config (apiUrl, prefetchThreshold, dev flags)
├── types.ts           # Shared types — Item.status: ItemStatus
├── logger.ts          # Structured console wrapper (info/warn/error with context)
├── itemImages.ts      # Local image registry
├── screens/
│   └── SwipeScreen.tsx  # Thin orchestrator — composes hooks + components
├── hooks/
│   ├── useFeed.ts       # Feed loading, swipe recording, prefetch, error logging
│   └── useClearAll.ts   # DEV clear-all workflow (with optional confirm dialog)
└── components/
    ├── ItemCard.tsx
    ├── ItemImage.tsx    # Resolves local / remote / placeholder image
    ├── DetailModal.tsx
    ├── EmptyState.tsx
    └── ClearAllButton.tsx
```

---

## Feature 2: Core Swiping Flow

### User Stories
- **Card Dragging**: Users see available items as cards. Drag to bottom-right (cart icon) = Like. Drag to bottom-left (dismiss icon) = Dislike.
- **Quick Visual Info**: Card shows item image, name, and AI point value.
- **Extended Specs**: "i" button opens a modal with full item description.
- **Clean Feed**: Never show own items, already-interacted items, or unavailable items.

### Database Schema

```sql
CREATE TABLE items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    points_value INT NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_items_feed_filtering ON items (status, user_id);

CREATE TABLE interactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL,
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    type SMALLINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);
CREATE UNIQUE INDEX idx_interactions_user_item ON interactions (user_id, item_id);
```

### Shared Enums

```typescript
enum ItemStatus { AVAILABLE = 1, TRADED = 2, ARCHIVED = 3 }
enum InteractionType { DISLIKE = 0, LIKE = 1 }
```

### API Endpoints

#### GET /v1/feed
Returns paginated items excluding own items and already-interacted items.
- Query: `?limit=20&offset=0`
- Implementation: `get_feed` Postgres RPC (filtering pushed entirely DB-side via `NOT EXISTS`)
- Logs: `Feed served` (info) / `Feed RPC failed` (error) / `Feed unexpected error` (error)

#### POST /v1/interactions
- Body: `{ item_id: number, type: InteractionType }`
- `type` validated against `[InteractionType.DISLIKE, InteractionType.LIKE]` — invalid → 400
- Unique `(user_id, item_id)` enforced at DB level; duplicates surface as Postgres `23505` and are mapped to **409 Conflict**
- Returns: 201 Created
- Logs: `Interaction recorded` / `Duplicate interaction attempted` / `Interaction insert failed` / `Interaction unexpected error`

#### POST /items
- Body: `{ name: string }`
- Inserts a new item with `status = ItemStatus.AVAILABLE`, `points_value = 0`, owned by `DEMO_USER_ID`
- Returns: 201 Created with the inserted row

#### DELETE /v1/dev/clear *(DEV only)*
- Deletes all interactions for `DEMO_USER_ID` so the feed returns to a fresh state
- Mounted via `devRouter` — must be removed/guarded before production
- Returns: `{ success: true }`

### Frontend
- Gesture-based card swiping via `react-native-deck-swiper`
- Bottom-right = Like (`InteractionType.LIKE`), Bottom-left = Dislike (`InteractionType.DISLIKE`)
- Info modal on "i" tap
- Pre-fetch next batch when remaining cards ≤ `config.feed.prefetchThreshold` (default 5)
- Empty state: "Oops, looks like you've swiped on everything nearby!"
- DEV: Clear-All button (`config.dev.enableClearAll`) calls `DELETE /v1/dev/clear` and reloads the feed
- All catch blocks log via the structured `logger` (no silent failures)

### Edge Cases
- Empty feed → placeholder screen
- Backend errors → 500 with `{ "error": "Internal Server Error" }`
- Network failures → non-intrusive alert, structured error log, no crash
- Stale closure on swipe handlers avoided by reading `cards` via ref inside `useFeed`

---

## Feature 3: Geo-Location Filtering

### User Stories
- **Nearby Items Only**: Users see only items from sellers within a configurable radius (default 50 km).
- **Distance Visibility**: Each card shows how far the item's owner is (e.g. "2.3 km").
- **Background Updates**: Location posts to the server when the user moves significantly (>100 m), keeping their feed relevant without draining battery.
- **Permission Gating**: If location is denied, the app shows a blocking screen with "Open Settings" until granted.

### Config

```typescript
// backend/src/config.ts & frontend/src/config.ts
export const SRID_WGS84 = 4326;

config.location = {
  DEFAULT_RADIUS_KM: 100,
  MAX_RADIUS_KM: 200,
  SIGNIFICANT_DISTANCE_CHANGE_METERS: 100,
};
```

### PostGIS Schema (004_geolocation.sql)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE user_locations (
  user_id UUID PRIMARY KEY,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX idx_user_locations_geo ON user_locations USING GIST (location);
```

### Updated `get_feed` RPC

```sql
CREATE FUNCTION get_feed(
  current_user_id UUID,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km INT,
  feed_limit INT,
  feed_offset INT
) RETURNS TABLE (
  id BIGINT, user_id UUID, name VARCHAR, description TEXT,
  points_value INT, status SMALLINT, image_url TEXT,
  created_at TIMESTAMPTZ, distance_km DOUBLE PRECISION
)
```

Filters via `ST_DWithin(ul.location, point, radius_km * 1000)` and JOINs `user_locations` — items whose owner has no location row are excluded.

### API Endpoints

#### POST /v1/users/location
- Body: `{ latitude: number, longitude: number }`
- Validates lat ∈ [-90, 90], lng ∈ [-180, 180] via shared `parseLatLng` helper
- Upserts into `user_locations` (ON CONFLICT user_id DO UPDATE)
- Returns: 200 `{ success: true }`
- Logs: `Location updated` / `Location rejected: invalid input` / `Location upsert failed`

#### GET /v1/feed (updated)
- Query: `?latitude=32.08&longitude=34.78&radius_km=50&limit=20&offset=0`
- `latitude` + `longitude` **required** → 400 if missing
- `radius_km` clamped to [0, MAX_RADIUS_KM], defaults to DEFAULT_RADIUS_KM
- Response now includes `distance_km` per item, ordered nearest-first

### Frontend Flow

`useLocation` exposes a 4-state status: `pending | granted | fallback | denied`.

1. App mounts → `useLocation` requests foreground permission
2. **Permission denied + last stored location available** (`GET /v1/users/location` returns 200) → status `'fallback'`, coords sourced from server, app proceeds (a soft banner can be shown by the caller)
3. **Permission denied + no fallback** → status `'denied'` → `LocationDeniedScreen` (blocking, "Open Settings" button, re-checks on AppState `active`)
4. **Permission granted** → captures coords (with last-stored fallback if GPS read fails), posts to `POST /v1/users/location`, subscribes via `watchPositionAsync`, status `'granted'`
5. Coords passed to `useFeed` → included in every `fetchFeed` call
6. On significant movement (≥ `SIGNIFICANT_DISTANCE_CHANGE_METERS`) → re-posts location to backend (feed stays relevant)
7. While in `'denied'` or `'fallback'`, an `AppState` listener re-bootstraps the flow if the user grants permission via Settings and returns to the app

### Privacy Note
- Only foreground location is used (no background tracking)
- Location stored as a point geometry, not as address
- `distanceInterval` ensures minimal API calls (only on significant movement)

### Code Quality Compliance

| Rule | How Feature 3 follows it |
|------|--------------------------|
| **SRP** | `validation/location.ts` (lat/lng range), `validation/postgisPoint.ts` (POINT parser), `routes/users.ts` (HTTP only), `hooks/useLocation.ts` decomposed into `isPermissionGranted` / `fetchInitialCoords` / `fetchLastStoredCoords` / `postCoordsSafely` / `bootstrap` / `subscribeToMovement` |
| **Short functions** | Feed handler uses `parseFeedQuery`; validation is a single `parseLatLng`; each `useLocation` helper is single-purpose |
| **Structured logging** | Every success/failure path logs with pino context object — including DB error, empty-row, malformed-storage, and re-bootstrap-on-focus paths. No bare `catch {}`. |
| **Numeric enums / strict constants** | `ItemStatus.AVAILABLE` referenced from `004_geolocation.sql` via comment. `SRID_WGS84 = 4326` referenced from migration as the SRID source. `ItemStatus` enum used in all test seeds. |

---

## Feature 4: Match Engine & Seed Data

### User Stories
- **Mutual Like = Match**: When User A likes an item from User B, and User B has already liked an item from User A, a match is created automatically.
- **Match Celebration**: A modal overlay appears on the swiper when a match occurs ("It's a Match!").
- **Match List**: Users can view their matches via `GET /v1/matches`.
- **Multi-user Dev Testing**: An `X-User-Id` header (dev only) allows swapping identity without auth, enabling manual two-user match testing.

### Config

```typescript
// frontend/src/config.ts
config.dev = {
  enableClearAll: true,
  currentUserId: DEMO_USER_ID,  // swap to test as another user
};
```

### Database Schema (005_matches.sql)

```sql
CREATE TABLE matches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_one_id UUID NOT NULL,
  user_two_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT matches_canonical_pair CHECK (user_one_id < user_two_id),
  CONSTRAINT matches_unique_pair UNIQUE (user_one_id, user_two_id)
);
CREATE INDEX idx_matches_user_search ON matches (user_one_id, user_two_id);
```

Canonical ordering (`user_one_id < user_two_id`) prevents duplicate match rows regardless of who swipes second.

### `record_interaction` RPC

```sql
CREATE FUNCTION record_interaction(
  swiper_id UUID, item_id BIGINT, interaction_type SMALLINT
) RETURNS TABLE (success BOOLEAN, is_match BOOLEAN, match_id BIGINT)
```

Single transaction: inserts interaction → if LIKE, checks for mutual like → if mutual, inserts match row. Returns `success=false` on duplicate (23505). Returns `is_match=true` + `match_id` when a match is created.

### Seed Data (006_seed_match_users.dev.sql)

Two synthetic users with items in Tel Aviv (within radius of DEMO_USER_ID):
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` — "Yossi Acoustic Guitar"
- `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` — "Dani Leather Jacket"

### API Endpoints

#### POST /v1/interactions (updated)
- Now calls `record_interaction` RPC instead of direct insert
- Response: `{ success: true, is_match: boolean, match_id?: number }`
- Logs: `Interaction recorded` / `Match created` / `Duplicate interaction attempted`

#### GET /v1/matches (new)
- Returns current user's matches ordered by `created_at DESC`
- Response: array of match objects

### X-User-Id Middleware (dev only)
- Reads `X-User-Id` header when `NODE_ENV !== 'production'`
- Falls back to `DEMO_USER_ID` if absent
- Attaches `req.currentUserId` for all routes
- Refuses to honor the header in production

### Frontend
- `api.ts`: all requests attach `X-User-Id: config.dev.currentUserId`
- `postInteraction` now returns `{ success, is_match, match_id }`
- `MatchModal.tsx`: celebratory overlay with "Keep Swiping" button
- `SwipeScreen` shows modal when `is_match` comes back true

---

## Testing Strategy

| ID | File | Test | Type |
|----|------|------|------|
| F2-T1 | feed.test.ts | Returns only available items from other users | Integration |
| F2-T2 | feed.test.ts | Excludes already-interacted items | Integration |
| F2-T3 | feed.test.ts | Returns fewer items with higher offset | Integration |
| F2-T4 | interactions.test.ts | Creates interaction successfully | Integration |
| F2-T5 | interactions.test.ts | Returns 409 on duplicate | Integration |
| F2-T6 | interactions.test.ts | Exactly one row after duplicate attempt | Integration |
| F2-T7 | validation.test.ts | Rejects invalid type (3) | Unit |
| F2-T8 | validation.test.ts | Rejects negative type (-1) | Unit |
| F2-T9 | validation.test.ts | Rejects string type | Unit |
| F2-T10 | validation.test.ts | Rejects missing item_id | Unit |
| F2-T11 | errors.test.ts | Clean 500 when DB throws | Unit |
| F3-T1 | feed-geo.test.ts | Proximity join — nearby items returned, far items excluded | Integration |
| F3-T2 | feed-geo.test.ts | Owner without location → items excluded from feed | Integration |
| F3-T3 | users-location.test.ts | Invalid lat/lng → 400 | Integration |
| F3-T4 | users-location.test.ts | Upsert idempotence (post twice, 1 row) | Integration |
| F3-T5 | feed-geo.test.ts | Feed without lat/lng params → 400 | Integration |
| F3-T6 | users-location-get.test.ts | GET returns 404 when no row stored | Integration |
| F3-T7 | users-location-get.test.ts | GET returns 200 with parsed coords after upsert | Integration |
| F3-T8 | postgisPoint.test.ts | Parser accepts valid POINT, rejects malformed/garbage | Unit |
| F4-T1 | matches.test.ts | Mutual likes → is_match: true, match row created | Integration |
| F4-T2 | matches.test.ts | Like + dislike → no match | Integration |
| F4-T3 | matches.test.ts | Canonical ordering (user_one_id < user_two_id) | Integration |
| F4-T4 | matches.test.ts | Duplicate interaction → 409, no extra match row | Integration |
| F4-T5 | matches.test.ts | GET /v1/matches returns matches for both users | Integration |
| F4-T6 | currentUser.test.ts | Honors X-User-Id in dev, ignores in prod, falls back to DEMO | Unit |
