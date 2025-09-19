import mongoose, { Schema, models } from "mongoose";

const ReactionTestSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The type of entity being reacted to (post, review, question, comment, etc.)
    entityType: {
      type: String,
      enum: ["post", "review", "question", "comment", "topicpage", "wheel"],
      required: true,
      index: true,
    },

    // The specific entity's ID
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Reaction type (default to "like" for now, but can expand later)
    reactionType: {
      type: String,
      enum: ["like", "heart", "laugh", "sad", "angry"],
      default: "like",
      required: true,
    },
  },
  { timestamps: true }
);

// If you only want ONE reaction of any type per user per entity:
ReactionTestSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });

// If you want to allow multiple reaction types from same user on same entity:
// ReactionSchema.index({ userId: 1, entityType: 1, entityId: 1, reactionType: 1 }, { unique: true });

const ReactionTest = models.ReactionTest || mongoose.model("ReactionTest", ReactionTestSchema);
export default ReactionTest;
