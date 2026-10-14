import mongoose from "mongoose";
const { Schema, models } = mongoose;

/**
 * UserEntityStatus
 * ───────────────
 * Lightweight, user-specific progress/status for any content entity.
 *
 * This is intentionally separate from UnifiedList. Lists are for curation;
 * this collection is for tracking user progress (watched, played, favourite).
 *
 * Entity IDs are stored as strings because they can be either MongoDB ObjectIds
 * (for topic pages) or external API ids (for anime/game/movie lookups).
 */
const UserEntityStatusSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    entityType: {
      type: String,
      enum: ["movie", "anime", "game", "character"],
      required: true,
    },

    // TopicPage _id or external API id (string)
    entityId: {
      type: String,
      required: true,
      trim: true,
    },

    // Human-readable name cached for easy display
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Current progress status. Kept minimal on purpose:
    // UserEntityStatus strictly tracks completed/favorite items ("done").
    // Unmarking deletes the document. "want" is accepted for backward compatibility with legacy rows.
    status: {
      type: String,
      enum: ["done", "want"],
      default: "done",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique status per user + entity
UserEntityStatusSchema.index({ userId: 1, entityId: 1 }, { unique: true });

// Common query: all watched movies / played games / favourite characters for a user
UserEntityStatusSchema.index({ userId: 1, entityType: 1, status: 1, createdAt: -1 });

const UserEntityStatus =
  models.UserEntityStatus ||
  mongoose.model("UserEntityStatus", UserEntityStatusSchema);

export default UserEntityStatus;
