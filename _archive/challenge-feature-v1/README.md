# Challenge Feature - Archived v1.0

**Date Archived:** May 9, 2026  
**Status:** On-hold pending architectural pivot to `wheelType` model

---

## Overview

This directory contains the complete Challenge feature as built in the initial implementation phase. It has been archived to make way for a redesigned architecture where "Challenge" becomes a `wheelType` property on the core `Wheel` model rather than a separate collection.

---

## What Was Archived

### 1. Models
- **`challenge.js`** — MongoDB schema for Challenge documents. Defined fields like `tier` (common/rare/epic), `badgeSlug`, `verificationHint`, `quizQuestions`, `wheelId`, and `wheelPath`.

### 2. UI Pages & Components
- **`challenges/`** — The dedicated `/challenges` page and its sub-routes. Contained:
  - `ChallengesClient.js` — Main challenges list page with "Ready to Verify" section
  - `ActiveChallengeBar.js` — Component showing active pending challenges
  - Related sub-components

### 3. API Routes
- **`api-challenges/`** — User-facing challenge endpoints:
  - `GET /api/challenges` — Fetch all active challenges
  - `GET /api/challenges/active` — Fetch pending challenges for the logged-in user
  
- **`api-admin-challenges/`** — Admin-only endpoints:
  - `POST /api/admin/challenges/create` — Create a new challenge
  - `GET /api/admin/challenges/search-wheels` — Search wheels by name to link to challenges

---

## Architectural Notes

### Why This Approach Was Abandoned

The initial architecture created a **1:Many relationship** between Wheels and Challenges:
```
Challenge { wheelId, wheelTitle, wheelPath, badgeSlug, ... }
    ↕ (join via wheelId)
Wheel { title, data, segments, ... }
```

This introduced:
- **Denormalization debt**: `wheelTitle` and `wheelPath` on Challenge documents could drift
- **Sync bugs**: The `/api/admin/challenges/search-wheels` endpoint required 401 auth fixes
- **Feature fragmentation**: Two separate UI sections (`/wheels` and `/challenges`) competing for user attention
- **Relational friction**: Every challenge lookup required a join operation

### The New Direction: `wheelType` 

Instead, challenges will be integrated as a `wheelType` property:
```js
// Wheel model will have
wheelType: { type: String, enum: ["default", "challenge", "quiz", "content"], default: "default" }
challenge: {
  tier: String,
  badgeSlug: String,
  verificationHint: String,
  quizQuestions: Number,
  // ... other fields
}
```

**Benefits:**
- Zero joins, zero sync bugs
- Organic discovery (Challenge Wheels appear in `/explore` feed)
- Unified wheel editor (one "Make this a Challenge" toggle)
- Aligns with successful patterns like listchallenges.com

---

## Preserved Systems

The following systems were built to support Challenges and remain active:

### `DecisionLog` Model Enhancements
- Added `status` field: `"pending"`, `"done"`, `"dropped"` (in `models/decisionLog.js`)
- Tracks asynchronous verification flow (spin now, verify later)
- **Will be reused** by the new `wheelType` architecture

### `WinnerPopup.js` Integration
- Modified `saveDecision()` to pass `entityId`, `entityType`, `entitySlug`
- **Will be reused** — no changes needed

### Badge Awarding System
- Verified and functional
- **Will be reused** — badges are type-agnostic

---

## Restoration Path

If you need to restore this version:
```bash
# Restore all files
mv _archive/challenge-feature-v1/challenge.js models/
mv _archive/challenge-feature-v1/challenges app/
mv _archive/challenge-feature-v1/api-challenges app/api/challenges
mv _archive/challenge-feature-v1/api-admin-challenges app/api/admin/challenges
```

---

## Related Documentation

See `_usecases/TEACHER_USE_CASES.md` for the educational use case that drove this feature's initial design.

---

## Next Steps

1. Extend `Wheel` schema with `wheelType` and `challenge` sub-document
2. Remove `Challenge` collection references from admin UI
3. Add "Make this a Challenge" toggle to wheel editor
4. Move "Ready to Verify" UI to user Profile page
5. Index challenge wheels in the main feed with a visual indicator
