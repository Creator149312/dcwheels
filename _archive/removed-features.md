# Removed Features Log

A running record of features that were built, removed, and may be worth revisiting later.

---

## StreamingServices
**Removed:** 2026-05-03  
**Why removed:** No UI adoption at launch. Users weren't incentivized to link their streaming subscriptions, and filtering TMDB results by provider availability isn't critical when user base is small and content catalog is abundant.

**What it did:**  
Allowed users to specify which streaming platforms they subscribed to (Netflix, Prime, Disney+, etc.) via TMDB provider IDs. The `/api/tmdb/fetch` route would read this list and exclude movies not available on their services from recommendation results.

**What was removed:**
- `User` model field: `streamingServices: [Number]`
- UI section from `app/dashboard/account/AccountSettingsForm.js`: "My Streaming Services" form with 10-platform multi-select checkboxes
- `initialStreamingServices` prop from account form
- Streaming filter logic in `app/api/tmdb/fetch/route.js` (user lookup + provider filtering was dropped)
- Streaming service handling from `app/api/user/settings/route.js` (GET/PATCH now only handles `publicSpins`)

**To restore:**  
1. Add `streamingServices: { type: [Number], default: [] }` back to `models/user.js`
2. Restore the streaming services section to `AccountSettingsForm.js` (STREAMING_PLATFORMS constant + UI block)
3. Add back the user lookup and filtering logic in `app/api/tmdb/fetch/route.js`
4. Restore streamingServices handling in `app/api/user/settings/route.js`
5. Pass `initialStreamingServices` prop from account page to form

---

## BurnList
**Removed:** 2026-05-03  
**Why removed:** No UI was ever built for it. At launch stage, users haven't consumed enough recommendations for a "never show again" filter to matter. All backend code was correct but the feature was entirely invisible to users.

**What it did:**  
A per-user exclusion list stored on the `User` model. When users marked a movie/anime/game as "done", it was appended to their `burnList`. Discovery API routes (`/api/tmdb/fetch`, `/api/media/anime`, `/api/media/games`) read the list and excluded those items from future recommendation results.

**What was removed:**
- `User` model field: `burnList: [{ entityType, externalId, markedAt }]`
- API route: `app/api/burn-list/route.js` (POST to add, GET to check)
- Filtering logic in `app/api/tmdb/fetch/route.js` (`userBurnListIds` Set + `.filter()`)
- Filtering logic in `app/api/media/games/route.js` (`burnIds` Set + `.filter()`)
- Filtering logic in `app/api/media/anime/route.js` (`burnIds` Set + `.filter()`)

**To restore:**  
1. Add `burnList` field back to `models/user.js`
2. Restore `app/api/burn-list/route.js`
3. Add burn-list exclusion block back to the three fetch routes
4. Build a "dismiss" / "Done" button UI in `ResultGrid.js` or `WinnerPopup`
5. Call `POST /api/burn-list` on dismiss

---

## BracketMode
**Removed:** (session prior to 2026-05-03)  
**Why removed:** Experimental tournament bracket for wheel segments. Not stable enough for launch.

**What it did:**  
Let users run a tournament-style bracket between wheel segments to find a winner through head-to-head matchups.

**What was removed:**
- `components/BracketMode.js` → moved to `components/_archive/BracketMode.js`
- `app/wheels/[slug]/bracket/page.js` (deleted)
- `app/uwheels/[wheelId]/bracket/page.js` (deleted)

---

## LiveSpinPopup
**Removed:** (session prior to 2026-05-03)  
**Why removed:** Global real-time popup showing community spins site-wide. Too noisy for early-stage launch; requires active user base to feel useful rather than empty.

**What it did:**  
A globally mounted popup (in `layout.js`) that showed real-time spin results from all users across the site using the `DecisionLog` model.

**What was removed:**
- `components/LiveSpinPopup.js` → moved to `components/_archive/LiveSpinPopup.js`
- Mount point + import removed from `app/layout.js`

---

## RecentSpinsSection
**Removed:** (session prior to 2026-05-03)  
**Why removed:** Per-entity community spin feed on content pages (e.g. `/movie/inception`). Requires real spin volume to be meaningful; empty at launch.

**What it did:**  
Showed a feed of recent community spins for a specific entity on its content page, powered by `GET /api/decisionlog/by-entity`.

**What was removed:**
- `components/RecentSpinsSection.js` → moved to `components/_archive/RecentSpinsSection.js`
- Import + entire "── 3. Recent Spins ──" JSX block removed from `app/(content)/[type]/TopicInteractionTabs.js`

---

## /ulists (Legacy List Routes)
**Removed:** (session prior to 2026-05-03)  
**Why removed:** Duplicate of `/lists`. Used the old `List` model and `/api/list` API while `/lists` uses the modern `UnifiedList` model and `/api/unifiedlist` API.

**What was removed:**
- `app/ulists/` entire directory (deleted)
- `components/lists/ListDashboard.js` (deleted — never imported anywhere, used old API)
- `Disallow: /ulists` line removed from `app/robots.txt`
- 301 redirects added in `next.config.mjs`: `/ulists/:listId` → `/lists/:listId` and `/ulists` → `/lists`

---

## Smart Media Generation (MediaWheelTab / MovieWheelBuilder)
**Removed:** 2026-05-03  
**Why removed:** Reduces distraction from the core loop of creating personal lists from /movies, /anime, /games pages. External APIs (RAWG, AniList) add points of failure for launch. A great feature to reserve for a "V2" marketing push when the app is ready for "Instant Media Wheels".

**What it did:**  
A component that allowed users to auto-populate a wheel with trending/popular games, movies, and anime by querying external APIs directly (TMDB, RAWG and AniList) instead of browsing the catalog manually. (Not to be confused with the text-based AI Smart Wheel, which was kept).

**What was removed:**
- pp/api/media/anime/route.js (AniList proxy route)
- pp/api/media/games/route.js (RAWG proxy route)
- components/MediaWheelTab.js (UI for selecting media type and triggering generation)
- components/MovieWheelBuilder.js (UI specific to movies)

**To restore:**  
1. Restore the pp/api/media directory with API proxy routes (taking care of RAWG/AniList keys).
2. Restore the components/MediaWheelTab.js and components/MovieWheelBuilder.js files.
3. Integrate them back into relevant UI surfaces.

---

## Legacy Q&A Models + Help Me Decide
**Removed:** 2026-05-04  
**Why removed:** Superseded by the unified `AskDilemma` model. Three separate Q&A schemas (`Question`, `YesNoQuestion`, `QuestionVote`) created duplicate data paths with no active UI consumers. `/help-me-decide` page was orphaned.

**What it did:**  
`Question` stored open-ended questions. `YesNoQuestion` stored binary yes/no polls. `QuestionVote` tracked votes on both. `/help-me-decide` was a feed page listing these questions.

**What was removed:**
- `models/question.js`
- `models/yesnoquestion.js`
- `models/questionvote.js`
- `app/api/questions/` (entire directory)
- `app/api/yesnoquestions/` (entire directory)
- `app/api/help-me-decide/` (entire directory)
- `app/help-me-decide/page.js`
- `components/qna/HelpMeDecideFeed.js`

**To restore:**  
Re-implement using the existing `AskDilemma` model. Do not restore the old schemas.

---

## ListSelector Wheel-Type Modal
**Removed:** 2026-05-04  
**Why removed:** Only one option ("Basic") was ever visible. The modal added a pointless confirmation step on every list load. `prepareAdvancedWheel` and `prepareQuizWheel` referenced a stale `listData.words` field that doesn't exist on `UnifiedList` (they would have crashed if re-enabled).

**What it did:**  
When a user selected a list from the dropdown in the home wheel editor, a modal appeared asking "What type of Wheel do you want to create?" with a dropdown offering Basic / Advanced / Quiz. User had to click Confirm to actually load the list.

**What was removed:**
- Modal JSX block in `components/lists/ListSelector.js`
- `isModalOpen`, `userChoice`, `selectedType`, `listData`, `selectedListTitle` state variables
- `handleUserChoice`, `loadDataForType`, `closeModal`, `prepareAdvancedWheel`, `prepareQuizWheel` functions
- Unused imports: `useLists`, `generateRandomizedMCQsBasic`

**To restore:**  
Re-add a wheel-type selector only if Advanced/Quiz modes are fully implemented against the `UnifiedList.items` schema (not `listData.words`). The Basic path now loads instantly on selection in `handleListChange`.
