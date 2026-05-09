import mongoose, { Schema, models } from "mongoose";

/**
 * UserBadge — awarded when a user successfully completes a challenge.
 *
 * One document per (userId, challengeId) pair — a user can only earn each
 * badge once. The decisionLogId links to the spin that triggered completion.
 */
const UserBadgeSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
    },

    // Denormalized fields for fast profile rendering without extra joins
    badgeSlug:    { type: String, required: true },
    badgeTitle:   { type: String, required: true },
    tier:         { type: String, enum: ["common", "rare", "epic"], required: true },
    entityType:   { type: String, default: "" },

    // The spin result that completed the challenge
    decisionLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DecisionLog",
    },
    spinResult: { type: String, default: "" }, // e.g. "Attack on Titan"
  },
  { timestamps: true }
);

// Prevent duplicate badge awards
UserBadgeSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

// Profile page: all badges for a user, newest first
UserBadgeSchema.index({ userId: 1, createdAt: -1 });

const UserBadge = models.UserBadge || mongoose.model("UserBadge", UserBadgeSchema);
export default UserBadge;
