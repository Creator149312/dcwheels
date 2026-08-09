import mongoose from "mongoose";
const { Schema, models } = mongoose;

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
  image: {
    type: String,
    default: null,
  },
  // Poll option image variants: sm=240px, md=480px. Legacy fallback to `image`.
  imageVariants: {
    sm: { type: String, default: null },
    md: { type: String, default: null },
  },

  // Denormalized vote tally for this option. Updated atomically by the vote API.
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
    // Legacy posts only store `image`. New posts store `imageVariants` and keep
    // `image` pointing to the largest variant for backward compatibility.
    image: {
      type: String,
      default: null,
    },

    imageVariants: {
      sm: { type: String, default: null }, // 480px
      md: { type: String, default: null }, // 780px
      lg: { type: String, default: null }, // 1080px
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
      segmentCount: {      // Wheel-only: number of segments for preview cards
        type: Number,
        default: 0,
      },
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

    // SEO & Unified Routing
    slug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    indexed: { type: Boolean, default: false },
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

  // Generate SEO-friendly slug from content
  if (this.content) {
    this.slug = this.content
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
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

// Compound for public user/profile feeds that filter by userId + isPublic + sort by recency.
postSchema.index(
  { userId: 1, isPublic: 1, createdAt: -1 },
  { partialFilterExpression: { isDeleted: false, shadowBanned: false } }
);

/**
 * Mongoose Hooks for Tag Count Automation
 * 
 * Logic: A post only counts towards tag discovery if:
 * 1. isPublic: true
 * 2. isDeleted: false
 * 3. shadowBanned: false
 */
postSchema.pre("save", async function (next) {
  if (!this.isNew) {
    try {
      const oldDoc = await this.constructor
        .findById(this._id)
        .select("tags isPublic isDeleted shadowBanned")
        .lean();
      if (oldDoc) {
        this._oldState = {
          tags: oldDoc.tags || [],
          isPublic: oldDoc.isPublic !== false,
          isDeleted: !!oldDoc.isDeleted,
          shadowBanned: !!oldDoc.shadowBanned,
        };
      }
    } catch (err) {
      console.error("Error fetching old state in post pre-save:", err);
    }
  }
  next();
});

postSchema.post("save", async function () {
  try {
    const { updateTagCounts } = await import("../lib/tagUpdateHelper.js");

    const wasLive = this._oldState
      ? this._oldState.isPublic &&
        !this._oldState.isDeleted &&
        !this._oldState.shadowBanned
      : false;
    const isLive =
      this.isPublic && !this.isDeleted && !this.shadowBanned;

    if (!wasLive && isLive) {
      await updateTagCounts(this.tags, 1, "askCount");
    } else if (wasLive && !isLive) {
      await updateTagCounts(this._oldState.tags, -1, "askCount");
    } else if (wasLive && isLive) {
      const oldTags = this._oldState.tags || [];
      const added = this.tags.filter((t) => !oldTags.includes(t));
      const removed = oldTags.filter((t) => !this.tags.includes(t));

      if (added.length > 0) await updateTagCounts(added, 1, "askCount");
      if (removed.length > 0) await updateTagCounts(removed, -1, "askCount");
    }
  } catch (err) {
    console.error("Error in post post-save hook:", err);
  }
});

postSchema.post("remove", async function () {
  try {
    const isLive = this.isPublic && !this.isDeleted && !this.shadowBanned;
    if (isLive) {
      const { updateTagCounts } = await import("../lib/tagUpdateHelper.js");
      await updateTagCounts(this.tags, -1, "askCount");
    }
  } catch (err) {
    console.error("Error in post post-remove hook:", err);
  }
});

const Post = models.Post || mongoose.model("Post", postSchema);

export default Post;
