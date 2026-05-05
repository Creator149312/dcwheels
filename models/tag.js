import mongoose, { Schema, models } from "mongoose";

/**
 * Canonical tag record.
 *
 * `slug`       — lowercase-hyphenated URL key, e.g. "horror-movies".
 *               This is what appears in /tags/[tagId] URLs.
 * `displayName`— Human-readable label, e.g. "Horror Movies".
 * `aliases`    — Other strings that should resolve to this tag.
 *               e.g. ["horror", "scary-movies", "horror-films"].
 *               The autocomplete + getWheelsByTag resolve these before
 *               querying wheels/asks.
 * `wheelCount` — Denormalized count (updated by cron or on save).
 * `askCount`   — Denormalized count (updated by cron or on save).
 * `isPublic`   — Set false to hide thin/spam tags without deleting them.
 */
const tagSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    aliases: {
      type: [String],
      default: [],
      index: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    wheelCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    askCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Text index so admin search works across slug + displayName + aliases.
tagSchema.index({ slug: "text", displayName: "text", aliases: "text" });

const Tag = models.Tag || mongoose.model("Tag", tagSchema);
export default Tag;
