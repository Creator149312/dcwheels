import mongoose, { Schema, models } from "mongoose";

/**
 * Challenge — a curated task tied to a content category.
 *
 * Tier levels (visual cues on the UI):
 *   "common" — green  — easy one-time spin task (~10 XP equivalent)
 *   "rare"   — blue   — medium multi-step task
 *   "epic"   — purple — streak or deep-engagement task
 *
 * entityType mirrors DecisionLog.entityType so challenges can be matched
 * to the winner segment automatically. Leave blank for generic wheels.
 */
const ChallengeSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 500 },

    // Content category this challenge belongs to.
    // "" means it applies to any wheel (generic challenge).
    entityType: {
      type: String,
      enum: ["anime", "movie", "game", "character", ""],
      default: "",
      index: true,
    },

    // Difficulty tier
    tier: {
      type: String,
      enum: ["common", "rare", "epic"],
      default: "common",
      index: true,
    },

    // The badge slug awarded on completion (maps to a badge definition in
    // the badge registry). e.g. "anime-explorer", "movie-marathoner"
    badgeSlug: { type: String, required: true },

    // For epic/streak challenges — how many distinct days of DecisionLog
    // "done" entries are required. 0 means single completion.
    streakDays: { type: Number, default: 0, min: 0 },

    // Human-readable instruction shown in the quest card.
    // e.g. "Watch the first episode of the anime you spun"
    taskInstruction: { type: String, default: "" },

    // Short verification hint shown before the quiz.
    // e.g. "Answer 3/5 questions about the title you watched"
    verificationHint: { type: String, default: "" },

    // Number of questions to generate for verification quiz (3–5).
    quizQuestions: { type: Number, default: 3, min: 3, max: 5 },

    // Minimum correct answers required to pass (out of quizQuestions).
    quizPassThreshold: { type: Number, default: 2, min: 1 },

    // Whether this challenge is visible to users.
    active: { type: Boolean, default: true, index: true },

    // Optional: link to a specific wheel. When set, users must spin THIS wheel
    // to complete the challenge (enables precise tracking via wheelId match).
    // wheelTitle is denormalized for display without a join.
    wheelId: { type: Schema.Types.ObjectId, ref: "Wheel", default: null, index: true },
    wheelTitle: { type: String, default: "" },
    wheelPath: { type: String, default: "" },
  },
  { timestamps: true }
);

// Browse by category + tier
ChallengeSchema.index({ entityType: 1, tier: 1, active: 1 });

const Challenge = models.Challenge || mongoose.model("Challenge", ChallengeSchema);
export default Challenge;
