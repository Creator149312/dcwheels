# SpinWheel: Popular & Trending Features Analysis

> Comprehensive analysis of current data models, tracking capabilities, and infrastructure gaps for implementing Popular/Trending wheels and category-based discovery.

---

## 1. WheelAnalytics Model

### 📊 Current Definition
**File**: [models/wheelAnalytics.js](models/wheelAnalytics.js)

```javascript
{
  views: Number,              // ✓ tracked
  likes: Number,              // ✓ tracked
  dislikes: Number,           // ✓ tracked
  wheel: ObjectId,            // ref → Wheel
  timestamps: true            // createdAt, updatedAt
}
```

### 🔴 Critical Finding: **NOT ACTIVELY USED**
- Model exists but **zero API endpoints populate it**
- No code currently increments these fields
- Analytics collection likely empty
- Data is NOT being collected

### ✅ What IS Being Tracked
The project tracks data through **alternative systems**:

#### Visit Tracking (View Counts)
- **Model**: [models/visit.js](models/visit.js)
- **Fields**: `{userId, wheelId, visitedAt}`
- **API**: `POST /api/history/visit` (active)
- **Indexes**: `{userId: 1, visitedAt: -1}`
- **Capability**: Can aggregate to get view counts

#### Reaction Tracking (Likes/Engagement)
- **Model**: [models/reaction.js](models/reaction.js)
- **Scope**: Only for TopicPage (anime/movie/game/character content)
- **NOT used for custom Wheel reactions**
- **Fields**: `{userId, contentId, type, reaction}`
- **Denormalization**: TopicPage has `reactions: Map<String, Number>`

### 🎯 Recommendation
Leverage Visit model for views. Create new Wheel.reactions or repurpose WheelAnalytics with proper data collection hooks.

---

## 2. Wheel Data Model & Available Metrics

### 📝 Current Wheel Schema
**File**: [models/wheel.js](models/wheel.js)

```javascript
{
  // Identification
  title: String,              // required
  description: String,        // required
  
  // Content
  data: [Object],             // segment options
  wheelData: Object,          // {theme, spinDuration, segmentCount, ...}
  
  // Organization
  createdBy: String,          // username/userId
  tags: [String],             // e.g., ["anime", "trivia", "fun"]
  
  // Relationships
  relatedTo: {                // NEW: links to external content
    type: "anime"|"movie"|"game",
    id: String                // e.g., AniList ID
  },
  
  // Metadata
  createdAt: Date,            // via timestamps
  updatedAt: Date,            // via timestamps
}
```

### 📊 Missing Metrics
```javascript
// NOT in model - must be computed from Visit/Reaction tables:
viewCount              // ← needs aggregation from Visit
spinCount              // ← NO TRACKING (spinner events not logged)
likeCount              // ← needs aggregation from Reaction
lastViewedAt           // ← can compute from Visit
trendingScore          // ← calculated field
engagementRate         // ← computed metric
```

### ✅ What CAN Be Sorted/Filtered
1. **By Recency**: `createdAt: -1` (has index)
2. **By Tags**: `tags: 1` (has index)
3. **By Creator**: `createdBy: 1`

### ❌ What CANNOT Be Sorted (No Native Support)
- Most viewed wheels
- Most liked wheels
- Trending (recent + popular)
- By category/genre (unlike TopicPage)

---

## 3. Content Category Systems

### 🎌 Anime Categories
| Property | Details |
|----------|---------|
| **Source** | AniList API + npm `@spkrbox/anilist` |
| **Categories** | Genres: Action, Romance, Comedy, Horror, Fantasy, Sci-Fi, etc. |
| **Sorting Options** | `POPULARITY_DESC`, `SCORE_DESC`, `FAVOURITES_DESC` |
| **Data Model** | TopicPage (type: "anime") |
| **Fetcher** | `app/(content)/[type]/TopicPagesHelperFunctions.js` |
| **Browse URL** | `/anime` |
| **Fields Tracked** | title, genres, episodes, popularity, description, cover |

### 🎬 Movie Categories
| Property | Details |
|----------|---------|
| **Source** | TMDB API (The Movie Database) |
| **Categories** | Genres: Action (28), Comedy (35), Drama (18), Horror (27), Romance (10749), Sci-Fi (878) |
| **Note** | Genre IDs required for filtering |
| **Sorting** | By popularity, release year, rating |
| **Data Model** | TopicPage (type: "movie") |
| **Fetcher** | `app/(content)/[type]/TopicPagesHelperFunctions.js` |
| **Browse URL** | `/movie` |
| **Filtering** | Genre, release year, runtime |

### 🎮 Game Categories
| Property | Details |
|----------|---------|
| **Source** | RAWG API |
| **Categories** | Game genres, platforms |
| **Default Sort** | `-added` (newest) |
| **Data Model** | TopicPage (type: "game") |
| **Fetcher** | `app/(content)/[type]/TopicPagesHelperFunctions.js` |
| **Browse URL** | `/game` |
| **Fields** | name, background_image, genres, released |

### 👥 Character Categories
| Property | Details |
|----------|---------|
| **Source** | AniList API |
| **Sorting** | `FAVOURITES_DESC` (by community popularity) |
| **Data Model** | TopicPage (type: "character") |
| **Fetcher** | `app/(content)/[type]/TopicPagesHelperFunctions.js` |
| **Browse URL** | `/character` |
| **Fields** | name, image, gender, age, favourites |

### 🎡 Custom Wheel Categories
| Property | Details |
|----------|---------|
| **Category System** | Free-form tags only (no predefined categories) |
| **Storage** | `wheel.tags: [String]` |
| **Examples** | ["anime", "movies", "games", "trivia", "fun"] |
| **Query Method** | `/api/wheels-by-tag?tag=xyz` |
| **Limitation** | No hierarchical structure, no emoji/icons |

---

## 4. Current UI Structure & Discovery Points

### 🏠 Homepage (`/`)
**File**: [app/page.js](app/page.js)
- Interactive demo wheel
- Long SEO content
- **Status**: Pure content, NO discovery section

### 🎡 Browse All Wheels (`/wheels`)
**File**: [app/wheels/page.js](app/wheels/page.js)
- Fetches: `GET /api/page/all?limit=20&skip=0`
- **Sorting**: Newest first only (`createdAt: -1`)
- **Missing**: Trending filter, popularity sort, category filter
- **Components**: WheelClient.js (pagination on client)

### 🔎 Search Wheels (`/search/[titlesearch]`)
- Title-based search
- **NO ranking by relevance**

### 📺 Content Discovery (`/anime`, `/movie`, `/game`, `/character`)
**File**: [app/(content)/[type]/page.js](app/(content)/[type]/page.js)
- External API data (sorted by API's default popularity)
- Grid layout with pagination
- **Supports**: Genre filtering, pagination, year filtering
- **Limitation**: Only for external content, not custom wheels

### 🎯 Recommendation Pages (`/recommendation`)
**File**: [app/recommendation/page.js](app/recommendation/page.js)
- Multi-step quiz for anime/movies
- Results sorted by popularity/score
- Can show "Top 6" recommendations

### 👤 User Dashboard (`/dashboard`)
**File**: [app/dashboard/page.js](app/dashboard/page.js)
- Only shows user's own wheels
- No public discovery

### 💬 Feed (`/feed`)
**File**: [app/feed/page.js](app/feed/page.js)
- **Status**: Completely disabled/commented out

---

## 5. Database Queries & API Infrastructure

### ✅ Existing Query Infrastructure

| Endpoint | Query Logic | Sorting | Filters |
|----------|-----------|---------|---------|
| `GET /api/page/all` | `Page.find({})` | `createdAt: -1` | None |
| `GET /api/wheel/user/:id` | `Wheel.find({createdBy})` | Default | Creator |
| `GET /api/wheels-by-tag` | `Wheel.find({tags})` | Default | Tags |
| `GET /api/history/visit` | `Visit.find({userId})` | `visitedAt: -1` | User-scoped |
| `/anime`, `/movie`, etc. | External APIs | API default | Genre, year |

### ❌ Missing Infrastructure

| Need | Priority | Complexity |
|------|----------|-----------|
| Aggregate view counts from Visit | HIGH | Medium |
| `GET /api/wheels/popular` | HIGH | Medium |
| `GET /api/wheels/trending` | HIGH | Medium |
| Reactions endpoint for wheels | HIGH | Low |
| `GET /api/wheels/by-category` | MEDIUM | Low |
| `GET /api/top-tags` | MEDIUM | Low |
| Aggregation pipeline for stats | MEDIUM | High |

### 📊 Query Examples Needed

```javascript
// Popular wheels (all-time)
db.wheels.aggregate([
  { $lookup: { from: "visits", localField: "_id", foreignField: "wheelId", as: "visits" } },
  { $addFields: { viewCount: { $size: "$visits" } } },
  { $sort: { viewCount: -1 } },
  { $limit: 10 }
])

// Trending wheels (last 7 days)
db.wheels.aggregate([
  { $match: { createdAt: { $gte: Date.now() - 7*24*60*60*1000 } } },
  { $lookup: { from: "visits", ... } },
  { $addFields: { viewCount: { $size: "$visits" } } },
  { $sort: { viewCount: -1 } }
])

// Category-filtered with popularity
db.wheels.aggregate([
  { $match: { tags: "anime" } },
  { $lookup: { from: "visits", ... } },
  { $addFields: { popularity: { $size: "$visits" } } },
  { $sort: { popularity: -1 } }
])
```

---

## 6. Data Freshness Considerations

### Current Architecture
- **Tracking**: New visits logged in real-time ✓
- **Aggregation**: ZERO automatic aggregation ✗
- **Updates**: Query-time calculations only (expensive)
- **Caching**: No caching layer

### Three Strategies to Implement

#### 🚀 Strategy 1: Real-Time Denormalization (RECOMMENDED)
```javascript
// When: POST /api/history/visit creates a Visit
Wheel.findByIdAndUpdate(wheelId, { $inc: { viewCount: 1, lastViewedAt: new Date() } })
```
- **Pros**: Fast queries, simple indexes, predictable
- **Cons**: More writes, slight denorm complexity
- **Data freshness**: Immediate

#### ⏲️ Strategy 2: Periodic Batch (Cron)
```javascript
// Every 6 hours: Run aggregation & update denormalized fields
// Visit → WheelAnalytics → Wheel
```
- **Pros**: Off-peak processing, scales for analytics
- **Cons**: 6-hour stale window
- **Data freshness**: Eventual consistency

#### 🔄 Strategy 3: Query-Time Aggregation
```javascript
// On every request: $lookup from Visit collection
```
- **Pros**: Always fresh, no duplication
- **Cons**: Slow for large datasets, CPU intensive
- **Data freshness**: Real-time but expensive

### 📌 Recommendation
- Use **Strategy 1** for main `/popular` endpoints
- Use **Strategy 2** for analytics/reporting
- Cache results with 1-hour TTL for homepage

---

## 7. Component & API Gaps

### 🎨 UI Components Missing

```
✗ PopularWheelsGrid.js          - "Most Popular All-Time" section
✗ TrendingWheelsGrid.js         - "Trending This Week" section  
✗ CategoryFilterBar.js          - Tag/category selector
✗ WheelStatsBadge.js            - Views/likes display on cards
✗ PopularCategoriesSection.js   - Category browse carousel
✗ TrendingTagsCloud.js          - Tag popularity cloud
```

### 🔌 API Endpoints Missing

```javascript
// In app/api/wheels/popular/route.js
GET /api/wheels/popular?limit=10&timeframe=allTime  
→ Returns top 10 wheels by views

// In app/api/wheels/trending/route.js
GET /api/wheels/trending?limit=10&since=7d
→ Returns trending wheels from last 7 days

// In app/api/wheels/by-category/route.js
GET /api/wheels/by-category?tag=anime&sort=popular&limit=20
→ Returns category wheels sorted by popularity

// In app/api/tags/trending/route.js
GET /api/tags/trending?limit=20
→ Returns most used tags

// In app/api/wheels/reactions/route.js
POST /api/wheels/:wheelId/reactions
GET /api/wheels/:wheelId/reactions
→ Track reactions for custom wheels (currently only TopicPage)
```

### 📱 Homepage Sections to Add

```jsx
1. Hero Search Section
2. "✨ Trending This Week" (6 wheels)
3. "🔥 Most Popular" (6 wheels)
4. "🎌 Browse by Category" (tag grid)
5. "⭐ Featured Collections" (curated wheels)
6. Call-to-action for wheel creation
```

---

## 8. Proposed Implementation Roadmap

### Phase 1️⃣: Enable Analytics (2 days)
- [ ] Add fields to Wheel model: `viewCount`, `likeCount`, `spinCount`, `lastViewedAt`
- [ ] Update POST `/api/history/visit` to increment `wheel.viewCount`
- [ ] Create reaction endpoint for custom wheels
- [ ] Backfill view counts from Visit collection

### Phase 2️⃣: Build Query APIs (3 days)
- [ ] `GET /api/wheels/popular` - sort by viewCount
- [ ] `GET /api/wheels/trending` - filter recent + sort by viewCount
- [ ] `GET /api/wheels/by-category` - filter by tags + sort
- [ ] `GET /api/tags/top` - trending tags
- [ ] Add query indexes: `{viewCount: -1}`, `{tags: 1, viewCount: -1}`

### Phase 3️⃣: Build UI Components (4 days)
- [ ] `PopularWheelsGrid.js` - reusable component
- [ ] `TrendingWheelsGrid.js` - same with date filter
- [ ] `CategoryFilterBar.js` - tag selector
- [ ] `WheelCard.js` - with stats display
- [ ] Update `/wheels` page with filters

### Phase 4️⃣: Update Homepage (2 days)
- [ ] Add sections to `app/page.js`
- [ ] Wire up trending/popular endpoints
- [ ] Add category browse section
- [ ] Optimize for mobile

### Phase 5️⃣: Analytics Dashboard (Optional) (3 days)
- [ ] Creator dashboard with wheel stats
- [ ] Public stats page for wheels
- [ ] Trending graph visualization

---

## 9. Database Schema Additions

### Wheel Model Update
```javascript
{
  // ... existing fields ...
  
  // New metrics (real-time denormalized)
  viewCount: { 
    type: Number, 
    default: 0,
    index: true             // ← for sorting
  },
  
  likeCount: { 
    type: Number, 
    default: 0,
    index: true 
  },
  
  spinCount: { 
    type: Number, 
    default: 0 
  },
  
  lastViewedAt: { 
    type: Date,
    default: null 
  },
  
  // Computed fields (updated hourly)
  trendingScore: {
    type: Number,
    default: 0              // (views * 0.7) + (likes * 5) - age_penalty
  },
  
  category: {               // Proposed: explicit category field
    type: String,
    enum: ["anime", "movie", "game", "character", "general"],
    default: "general"
  }
}
```

### New Compound Indexes
```javascript
// For popular sorting
{viewCount: -1}
{likeCount: -1}
{trendingScore: -1}

// For filtered + sorted queries
{tags: 1, viewCount: -1}
{category: 1, viewCount: -1}
{createdAt: -1, viewCount: -1}
```

---

## 10. Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| View count tracking | HIGH | LOW | 🔴 DO FIRST |
| Popular wheels API | HIGH | MEDIUM | 🔴 DO FIRST |
| Trending wheels API | HIGH | MEDIUM | 🔴 DO FIRST |
| Homepage sections | MEDIUM | MEDIUM | 🟠 DO SECOND |
| Category filters | MEDIUM | LOW | 🟠 DO SECOND |
| Wheel reactions | MEDIUM | LOW | 🟠 DO SECOND |
| Analytics dashboard | LOW | HIGH | 🟡 DO LATER |
| Tag trending | LOW | LOW | 🟡 DO LATER |

---

## 11. Key Files Reference

### Data Models
- [models/wheel.js](models/wheel.js) - Main wheel schema
- [models/wheelAnalytics.js](models/wheelAnalytics.js) - Unused analytics model
- [models/visit.js](models/visit.js) - View tracking
- [models/reaction.js](models/reaction.js) - Engagement tracking
- [models/topicpage.js](models/topicpage.js) - External content pages

### API Routes
- [app/api/page/all/route.js](app/api/page/all/route.js) - List all wheels
- [app/api/history/visit/route.js](app/api/history/visit/route.js) - Track visits
- [app/api/reactions/route.js](app/api/reactions/route.js) - Topic reactions
- [app/api/wheels-by-tag/route.js](app/api/wheels-by-tag/route.js) - Tag filtering

### UI Pages
- [app/page.js](app/page.js) - Homepage
- [app/wheels/page.js](app/wheels/page.js) - Browse wheels
- [app/(content)/[type]/page.js](app/(content)/[type]/page.js) - Content discovery
- [app/recommendation/page.js](app/recommendation/page.js) - Quiz recommendations

### Content Fetchers
- [app/(content)/[type]/TopicPagesHelperFunctions.js](app/(content)/[type]/TopicPagesHelperFunctions.js) - External API integration

---

## Summary Checklist

- ✅ WheelAnalytics model exists but unused - activate or replace
- ✅ Visit model actively tracks views (ready to use)
- ✅ Reaction model for TopicPage (extend to Wheels)
- ❌ Wheel model lacks view/like count fields - add them
- ❌ No popular/trending endpoints exist - build them
- ❌ No category system for custom wheels - use tags + add category field
- ❌ Homepage has no discovery sections - add them
- ❌ No UI components for stats - build them
- ✅ External content APIs already support popularity sorting

**Next Step**: Start Phase 1 by adding fields to Wheel model and implementing real-time denormalization on visit tracking.
