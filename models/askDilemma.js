import mongoose, { Schema, models } from "mongoose";

const optionSchema = new Schema({
  text: {
    type: String,
    required: true,
    maxlength: 100,
  },
  imageUrl: {
    type: String,
  },
  // Cached vote count per option — avoids aggregating AskVote on every feed render.
  // Increment via $inc when a vote is recorded.
  voteCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Catalog entity linked to this option (movie, tv show, anime, etc.)
  catalogRef: {
    type: {
      type: String,
      enum: ["movie", "tv", "anime", "game", "custom"],
    },
    externalId: String,    // e.g. "tmdb:27205", "anilist:21"
    canonicalSlug: String, // links to /movies/inception on content pages
    posterUrl: String,     // cached at creation time — never re-fetched
    metadata: {
      year: Number,
      rating: Number,
      genres: [String],
    },
  },
});

const askDilemmaSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      maxlength: 500,
    },
    options: {
      type: [optionSchema],
      validate: [v => v.length >= 2 && v.length <= 4, 'Must have between 2 and 4 options'],
      required: true,
    },
    rewardPool: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "resolved", "cancelled"],
      default: "active",
      index: true,
    },
    finalDecision: {
      // The option sub-document _id the OP ultimately chose
      type: mongoose.Schema.Types.ObjectId,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
      set: (tags) =>
        Array.isArray(tags)
          ? tags
              .map((t) =>
                typeof t === "string"
                  ? t
                      .toLowerCase()
                      .trim()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, "")
                      .replace(/^-+|-+$/g, "")
                  : t
              )
              .filter(Boolean)
          : tags,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Which content domain this ask belongs to — drives catalog rails + /vs/ aggregation
    topicType: {
      type: String,
      enum: ["movie", "tv", "anime", "game", "general"],
      default: "general",
      index: true,
    },
    // Denormalized genre/topic tags derived from catalog selections at creation time
    topicTags: {
      type: [String],
      default: [],
    },
    // Set when user escalates a wheel result to Ask Papa ("I spun X vs Y, help me choose")
    derivedFromWheelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wheel",
    },
    // The specific TopicPage this dilemma was posted from
    topicPageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TopicPage",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for querying active dilemmas
askDilemmaSchema.index({ status: 1, expiresAt: 1 });

const AskDilemma = models.AskDilemma || mongoose.model("AskDilemma", askDilemmaSchema);

export default AskDilemma;
