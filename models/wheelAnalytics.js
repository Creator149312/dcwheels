import mongoose, { Schema, models } from "mongoose";

//the following data is mainly used for wheelAnalyticss which are indexed /wheels
const wheelAnalyticsSchema = new Schema(
  {
    view_count: { type: Number, required: true, default: 0 },
    spin_count: { type: Number, required: true, default: 0 },
    // likes and dislikes are tracked via the Reaction model (Wheel.likeCount is the denormalized cache)
    wheel: {
      type: Schema.Types.ObjectId,
      ref: "Wheel",
      required: true,
      unique: true,
      index: true,
    },
    // Per-segment hit counts for "top result" + distribution chart on the
    // public wheel page. Keys are the sanitized segment label (see
    // `sanitizeSegmentKey` in lib/wheelAnalytics.js — dots / $ replaced,
    // trimmed, capped at 100 chars). Map gives us O(1) `$inc` per spin
    // without rewriting the whole structure. Existing rows get an empty
    // map on first new spin.
    segmentHits: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
    // Timestamp of the most recent spin. Used for the "last spun X ago"
    // freshness signal on the public wheel page — a cheap Information
    // Gain win that crawlers can't see on competitor sites.
    lastSpunAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

wheelAnalyticsSchema.index({ view_count: -1 });
wheelAnalyticsSchema.index({ spin_count: -1 });
// Powers /trending leaderboards ("most active wheels in the last 24h").
// Sparse so existing docs without lastSpunAt don't bloat the index.
wheelAnalyticsSchema.index({ lastSpunAt: -1 }, { sparse: true });

const WheelAnalytics = models.WheelAnalytics || mongoose.model("WheelAnalytics", wheelAnalyticsSchema);

export default WheelAnalytics;
