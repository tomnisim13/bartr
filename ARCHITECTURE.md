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
- Filtering via `NOT EXISTS` subquery (DB-level only)

#### POST /v1/interactions
- Body: `{ item_id: number, type: InteractionType }`
- Returns: 201 Created

### Frontend
- Gesture-based card swiping (react-native-deck-swiper or reanimated)
- Bottom-right = Like, Bottom-left = Dislike
- Info modal on "i" tap
- Pre-fetch next batch when stack runs low
- Empty state: "Oops, looks like you've swiped on everything nearby!"

### Edge Cases
- Empty feed → placeholder screen
- Backend errors → 500 with `{ "error": "Internal Server Error" }`
- Network failures → non-intrusive alert, no crash
