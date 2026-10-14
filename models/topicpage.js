import mongoose from "mongoose";
const { Schema, models } = mongoose;

//It instantly communicates that each page is centered around a specific topic,
// whether it's anime, movies, games, science, or even custom discussions like SquareTables.
// It also aligns beautifully with your platform’s vision of being a decision-first, community-driven space.
const TopicPageSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["anime", "movie", "game", "character", "custom"],
      required: true,
    },
    source: {
      type: String,
      enum: ["Anilist", "TMDB", "RAWG"],
      required: function () {
        return this.type !== "custom";
      },
    },
    relatedId: {
      // External API IDs are numeric; internal/custom pages may use ObjectIds.
      // We keep Mixed for compatibility, but all callers should coerce to String
      // when building contentRef / relatedTopics references.
      type: Schema.Types.Mixed,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      romaji: String, // anime
      english: String, // anime
      native: String, // anime
      original: String, // movie
      localized: String, // movie
      default: String, // fallback or display title
    },
    cover: String, // shared across all types
    description: String, // shared across all types
    wheels: {
      type: Number,
      default: 0,
    },
    // Flexible reaction counters (denormalized)
    // Using Map lets you add new reactions without schema changes
    reactions: {
      type: Map,
      of: Number,
      default: { like: 0 },
    },
    // "Worth It?" community vote — repurposed from the unused `followers` field.
    // Stores raw yes/no counts directly on the document to avoid a separate
    // collection for a lightweight signal. Percentage is derived at read time.
    // Both counters start at 0; the API increments them via $inc.
    worthIt: {
      yes: { type: Number, default: 0 },
      no:  { type: Number, default: 0 },
      meh: { type: Number, default: 0 },
    },
    // Nuanced rating system (1-5 stars)
    // totalScore: sum of all star ratings
    // ratingCount: number of star ratings
    // averageRating = totalScore / ratingCount
    rating: {
      totalScore: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => {
        const { normalizeTag } = require("@lib/slug");
        return Array.isArray(tags)
          ? tags
              .map((tag) => (typeof tag === "string" ? normalizeTag(tag) : tag))
              .filter(Boolean)
          : tags;
      },
    },
    details: {
      studio: String, // anime
      episodes: Number, // anime
      director: String, // movie
      runtime: Number, // movie
      releaseYear: Number, // shared
      platform: String, // game
      host: String, // custom
      theme: String, // custom
    },
    // Recommendations (optional if you added earlier)
    // recommendations: {
    //   external: { type: Number, default: null },
    //   count: { type: Number, default: 0 },
    //   total: { type: Number, default: 0 },
    //   average: { type: Number, default: 0 },
    // },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Canonical title normalization. Runs before both validation and save so
// every creation path (TopicPage.create, new TopicPage().save(), etc.) ends
// up with a populated `title.default`. Existing title variants are preserved;
// we only fill `title.default` when it's missing. This is safe for live data
// because it never deletes fields and never overwrites an already-populated
// default.
// ---------------------------------------------------------------------------
function ensureDefaultTitle(doc) {
  if (doc && doc.title && typeof doc.title === "object") {
    const t = doc.title;
    if (!t.default || String(t.default).trim() === "") {
      t.default =
        t.english ||
        t.localized ||
        t.romaji ||
        t.original ||
        t.native ||
        t.default;
    }
  }
}

TopicPageSchema.pre("validate", function (next) {
  ensureDefaultTitle(this);
  next();
});

TopicPageSchema.pre("save", function (next) {
  ensureDefaultTitle(this);
  next();
});

// Indexes — without these every getOrCreateTopicPage / getRelatedPages query
// degrades to a full collection scan.
// 1) Unique compound for the primary lookup `findOne({ type, relatedId })`
//    called on every page load. `unique` also prevents duplicate topic pages.
// 2) Multikey on tags for the `getRelatedPages` aggregation `$in` match.
// 3) Sort index for recency.
// 4) Text index on the canonical title for local full-text search. We keep
//    this title-only because description/tags matches tend to dilute result
//    relevance for a title-first search experience.
// 5) Sparse index on the canonical title for fast prefix/exact queries.
TopicPageSchema.index({ type: 1, relatedId: 1 }, { unique: true });
TopicPageSchema.index({ tags: 1 });
TopicPageSchema.index({ createdAt: -1 });
TopicPageSchema.index(
  { "title.default": "text" },
  { default_language: "none" }
);
TopicPageSchema.index({ "title.default": 1 }, { sparse: true });

const TopicPage =
  models.TopicPage || mongoose.model("TopicPage", TopicPageSchema);
export default TopicPage;
