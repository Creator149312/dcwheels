import mongoose, { Schema, models } from "mongoose";

/**
 * Post — unified model for community discussion.
 *
 * Handles both:
 * 1. Ask/Questions: "Should I watch Demon Slayer?"
 * 2. Posts/Shares: "Just finished Demon Slayer, amazing!"
 *
 * Both can optionally have a poll attached.
 */

const pollOptionSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  text: {
    type: String,
    required: true,
    maxlength: 65,
  },
  voteCount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const postSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Denormalized author info for high-performance feed fetching
    authorName: {
      type: String,
      index: true,
    },
    authorHandle: {
      type: String,
      index: true,
      lowercase: true,
    },
    authorImage: {
      type: String,
      default: null,
    },
    
    // Main content (600 chars max, similar to Threads/Twitter)
    content: {
      type: String,
      required: true,
      maxlength: 600,
    },

    // UI hint for feeds to apply "See More" logic
    hasTruncation: {
      type: Boolean,
      default: false,
    },
    
    // Optional image/media
    image: {
      type: String,
      default: null,
    },
    
    // Link to content (anime, movie, game, wheel)
    contentRef: {
      type: {
        type: String,
        enum: ["anime", "movie", "game", "wheel", "character", ""],
      },
      externalId: String,  // e.g. "21" (AniList ID)
      slug: String,        // e.g. "1291608-dhurandhar" — full URL slug
      title: String,       // Cached title
      image: String,       // Cached cover image
    },
    
    // OpenGraph Link Preview metadata
    ogMeta: {
      url: String,
      title: String,
      description: String,
      image: String,
      siteName: String,
    },
    
    // Optional poll
    hasPoll: {
      type: Boolean,
      default: false,
    },
    
    pollOptions: {
      type: [pollOptionSchema],
      default: [],
      validate: [
        (v) => v.length === 0 || (v.length >= 2 && v.length <= 6),
        "Poll must have 2-6 options if enabled",
      ],
    },
    
    // Tags for filtering
    tags: {
      type: [String],
      default: [],
      index: true,
      set: (tags) =>
        Array.isArray(tags)
          ? tags
              .map((t) =>
                typeof t === "string"
                  ? t.toLowerCase().trim().replace(/\s+/g, "-")
                  : t
              )
              .filter(Boolean)
          : tags,
    },
    
    // Engagement metrics
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Visibility
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Soft-delete: author deleted the post. Hidden everywhere but preserved
    // for audit/moderation purposes (same pattern as Reddit/Facebook).
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Moderation: set true if the author is shadow-banned or the post was
    // auto-flagged. Hidden from the public feed but the author can't tell.
    shadowBanned: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Running tally of community reports against this post.
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

/**
 * Automate truncation flag: 180 chars is the threshold for the "See More" UI.
 */
postSchema.pre("save", function (next) {
  if (this.content && this.content.length > 180) {
    this.hasTruncation = true;
  } else {
    this.hasTruncation = false;
  }
  next();
});

// Indexes for common queries
postSchema.index({ userId: 1, createdAt: -1 });

// PARTIAL INDEXES (Top-tier optimization used by X/Threads): 
// These indexes only include "live" public content. They are smaller, faster, 
// and skip all deleted/shadow-banned content at the database level.
postSchema.index(
  { isPublic: 1, createdAt: -1 },
  { partialFilterExpression: { isDeleted: false, shadowBanned: false, isPublic: true } }
);

postSchema.index(
  { "contentRef.externalId": 1, "contentRef.type": 1, createdAt: -1 },
  { partialFilterExpression: { isDeleted: false, shadowBanned: false, isPublic: true } }
);

postSchema.index(
  { tags: 1, createdAt: -1 },
  { partialFilterExpression: { isDeleted: false, shadowBanned: false, isPublic: true } }
);

const Post = models.Post || mongoose.model("Post", postSchema);

export default Post;
