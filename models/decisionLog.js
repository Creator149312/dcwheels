import mongoose, { Schema, models } from "mongoose";

const DecisionLogSchema = new Schema(
  {
    userId: { type: String, index: true, required: true },
    wheelId: { type: String, required: true },
    wheelTitle: { type: String, default: "" },
    result: { type: String, required: true },
    resultImage: { type: String, default: "" },
    note: { type: String, default: "" },
    // Whether this saved decision is visible in public per-wheel feeds
    // ("Spin Stories"). Set at write time from the user's `publicSpins`
    // preference so the feed query is a simple indexed match — no join
    // back to User per row.
    //
    // Default `false` keeps existing rows + privacy-conscious users out
    // of the public feed; users opt in via profile settings.
    isPublic: { type: Boolean, default: false },
    // Content entity this spin result refers to (movie, anime, game, character).
    // Written when the winner segment carries a payload with entityType/entityId
    // (i.e. segments produced by Smart Wheel's media routes). Left empty for
    // plain-text wheel results. Used by the per-content-page "Recent Spins" feed.
    entityType: { type: String, default: "" }, // "movie" | "anime" | "game" | "character"
    entityId:   { type: String, default: "" }, // stringified external ID (TMDB, AniList, RAWG)
    entitySlug: { type: String, default: "" }, // e.g. "550-fight-club" — for /[type]/[slug] links
    // DecisionLog is intentionally an append-only spin ledger. User progress
    // for content entities is tracked separately in UserEntityStatus.

    // Retention / TTL: Automatically expire logs after 180 days to avoid unbounded growth
    // and MongoDB index bloat while keeping recent history intact for feeds and analytics.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

DecisionLogSchema.index({ userId: 1, createdAt: -1 });
// Powers the per-wheel public feed query:
//   DecisionLog.find({ wheelId, isPublic: true }).sort({ createdAt: -1 })
// The compound is ordered { wheelId, isPublic, createdAt } so the same
// index also serves "all decisions on this wheel" admin queries that
// don't filter by isPublic, and lets Mongo do the sort from the index
// instead of in-memory.
DecisionLogSchema.index({ wheelId: 1, isPublic: 1, createdAt: -1 });

// Powers the global live feed query:
//   DecisionLog.find({ isPublic: true }).sort({ createdAt: -1 })
DecisionLogSchema.index({ isPublic: 1, createdAt: -1 });

// Powers the per-content-page "Recent Spins" feed:
//   DecisionLog.find({ entityType, entityId, isPublic: true }).sort({ createdAt: -1 })
DecisionLogSchema.index({ entityType: 1, entityId: 1, isPublic: 1, createdAt: -1 });


const DecisionLog =
  models.DecisionLog || mongoose.model("DecisionLog", DecisionLogSchema);
export default DecisionLog;
