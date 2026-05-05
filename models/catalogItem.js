import mongoose, { Schema, models } from "mongoose";

/**
 * CatalogItem — a cached snapshot of an external catalog entity.
 *
 * Acts as a write-through cache in front of TMDB, AniList, etc.
 * Records accumulate as users search and pick options in Ask Papa.
 * After 6 months this becomes a proprietary dataset of "entities people
 * actually argue about" — a much more valuable slice than raw TMDB.
 */
const catalogItemSchema = new Schema({
  type: {
    type: String,
    enum: ["movie", "tv", "anime", "game"],
    required: true,
    index: true,
  },
  // Source-namespaced ID: "tmdb:27205", "anilist:21", "igdb:1942"
  externalId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  year: Number,
  posterUrl: String,
  // Slug matching our content pages: "inception" → /movies/inception
  canonicalSlug: String,
  genres: [String],
  rating: Number,
  // When this entry was last synced from upstream — refresh after 30 days
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
});

// Primary lookup: one doc per (type, externalId) pair
catalogItemSchema.index({ type: 1, externalId: 1 }, { unique: true });
// Text search for Mongo-side autocomplete (fallback when cache is warm)
catalogItemSchema.index({ title: "text" });

const CatalogItem = models.CatalogItem || mongoose.model("CatalogItem", catalogItemSchema);

export default CatalogItem;
