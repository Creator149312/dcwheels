import mongoose from "mongoose";
const { Schema, models } = mongoose;

/**
 * title : used to display title at the tab of browser and to display heading in page
 * description: used to set description of page it is usually of length less than 125 words
 * data : is it the list data that is displayed in spinwheel and editor
 * createdBy : is the person who created the list
 * wheelData : is the wheel settings like theme of wheel, spin duration, number of segments to show on wheel etc.
 * content: is used to display content related to wheel in the page
 * category: is used to associate a category for a wheel
 * editorData: is data used to display editor with proper settings
 */

const wheelSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    data: {
      type: [Object],
      default: [],
      required: true,
      validate: {
        validator: function (v) {
          return v.length <= 200;
        },
        message: "A wheel cannot have more than 200 segments to ensure performance.",
      },
    }, // Array of wordDataObjects
    createdBy: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
      // Required for new wheels; existing wheels backfilled via migration script
    },
    authorHandle: {
      type: String,
      index: true,
      lowercase: true,
    },
    authorName: {
      type: String,
      index: true,
    },
    authorProfileImage: {
      type: String,
      default: null,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    wheelData: { type: Object, default: {} },
    // Tags are lowercased + trimmed on save so that:
    //   1) equal-match queries can fully use the `tags: 1` index
    //      (case-insensitive regex can't).
    //   2) there's one canonical form per tag, preventing "Anime" vs "anime"
    //      from fragmenting results on /tags/[tagId].
    // NOTE: existing pre-normalisation data should be backfilled with:
    //   db.wheels.updateMany({}, [{ $set: { tags: { $map: { input: "$tags",
    //     as: "t", in: { $toLower: "$$t" } } } } }])
    tags: {
      type: [String],
      default: [],
      set: (tags) =>
        Array.isArray(tags)
          ? tags
              .map((t) =>
                typeof t === "string"
                  ? t
                      .toLowerCase()
                      .trim()
                      .replace(/\s+/g, "-")        // spaces → hyphens
                      .replace(/[^a-z0-9-]/g, "")  // strip non-url chars
                      .replace(/^-+|-+$/g, "")      // trim leading/trailing hyphens
                  : t
              )
              .filter(Boolean) // drop any tags that normalised to empty string
          : tags,
    },
    //new field Added Related To
    //
    // Many-to-many association between a wheel and the TopicPages it is
    // "about". A "GTA or Need for Speed Picker" wheel has two entries
    // here — one per game. This replaces the earlier single-parent
    // `relatedTo` field; see scripts/migrate-relatedTo-to-relatedTopics.mjs
    // for the one-shot backfill that converted existing documents.
    //
    // Entries:
    //   { type: "game" | "anime" | "movie" | "character" | "custom",
    //     id:   external API id (string) or TopicPage _id (string) }
    //
    // `_id: false` keeps each sub-doc id-free — we never query individual
    // array elements by their own _id, only by {type, id}.
        relatedTopics: {
      type: [
        {
          type: {
            type: String,
            enum: ["anime", "movie", "game", "character", "custom"],
          },
          id: String,
          _id: false,
        },
      ],
      default: [],
    }, //end of relatedTopics

    editorData: {
      type: Object,
      default: {
        advOptions: false,
      },
    },
    wheelPreview: { type: String, default: null },
    // Whether this user-created wheel is visible in the public /explore gallery.
    // Defaults to false so existing wheels stay private until the owner opts in.
    // Admin-seeded wheels (createdBy = "admin") are surfaced separately via
    // the Page collection — this flag is for /uwheels user content only.
    isPublic: { type: Boolean, default: true },

    // Soft-delete: hidden from public feeds and direct hits. Preserved for audits.
    isDeleted: { type: Boolean, default: false, index: true },

    // "basic" = standard word/label wheel; "quiz" = MCQ quiz wheel where each
    // segment carries a question, options[], and correctIndex.
    // Stored explicitly so admin queries (Wheel.find({ type:"quiz" })) work.
    wheelType: { type: String, enum: ["basic", "quiz"], default: "basic" },
    // viewCount intentionally omitted — view tracking lives in WheelAnalytics.view_count
    // (bot-filtered, no auth required — a more accurate signal than auth-only visit logs)
    likeCount: { type: Number, default: 0 }, // denormalized from Reaction; kept here for fast index-based sorting
    // SEO & Content fields from legacy Page model
    content: [{ type: Object, default: {} }],
    indexed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

wheelSchema.index({ title: 1, createdBy: 1 }, { unique: true }); // Existing unique index, to keep a check on datastorage

// New indexes for performance improvements 
wheelSchema.index({ tags: 1 }); // speeds up $match on tags 

// NEW: Optimized userId compound index for profile/dashboard queries
wheelSchema.index({ userId: 1, createdAt: -1 });

// NEW: Compound for public profile gallery (userId + isPublic + like sorting)
wheelSchema.index({ userId: 1, isPublic: 1, likeCount: -1 });

// Multikey index on the topic associations. Serves TopicPage → related
wheelSchema.index({ "relatedTopics.type": 1, "relatedTopics.id": 1 });

// Powers the community gallery query: public user wheels sorted by likes/recency.
wheelSchema.index({ isPublic: 1, likeCount: -1, createdAt: -1 });

// SEO & Unified Routing: lookup by slug is the primary path for indexed content.
wheelSchema.index({ slug: 1 }, { sparse: true });

// SCALING: Compound indexes for high-traffic filtering & sorting
wheelSchema.index({ userId: 1, isPublic: 1, createdAt: -1 });
wheelSchema.index({ tags: 1, isPublic: 1, likeCount: -1 });

/**
 * Mongoose Hooks for Tag Count Automation
 * 
 * Logic: A wheel only counts towards tag discovery if:
 * 1. isPublic: true
 * 2. isDeleted: false
 */
wheelSchema.pre("save", async function (next) {
  if (!this.isNew) {
    try {
      const oldDoc = await this.constructor
        .findById(this._id)
        .select("tags isPublic isDeleted")
        .lean();
      if (oldDoc) {
        this._oldState = {
          tags: oldDoc.tags || [],
          isPublic: oldDoc.isPublic !== false,
          isDeleted: !!oldDoc.isDeleted,
        };
      }
    } catch (err) {
      console.error("Error fetching old state in wheel pre-save:", err);
    }
  }
  next();
});

wheelSchema.post("save", async function () {
  try {
    const { updateTagCounts } = await import("../lib/tagUpdateHelper");

    const wasLive = this._oldState
      ? this._oldState.isPublic && !this._oldState.isDeleted
      : false;
    const isLive = this.isPublic && !this.isDeleted;

    if (!wasLive && isLive) {
      // Just became live (newly created OR toggled from private/deleted)
      await updateTagCounts(this.tags, 1, "wheelCount");
    } else if (wasLive && !isLive) {
      // Just hidden or deleted
      await updateTagCounts(this._oldState.tags, -1, "wheelCount");
    } else if (wasLive && isLive) {
      // Stayed live, but tags might have changed
      const oldTags = this._oldState.tags || [];
      const added = this.tags.filter((t) => !oldTags.includes(t));
      const removed = oldTags.filter((t) => !this.tags.includes(t));

      if (added.length > 0) await updateTagCounts(added, 1, "wheelCount");
      if (removed.length > 0) await updateTagCounts(removed, -1, "wheelCount");
    }
  } catch (err) {
    console.error("Error in wheel post-save hook:", err);
  }
});

// Handle physical deletion
wheelSchema.post("remove", async function () {
  try {
    const isLive = this.isPublic && !this.isDeleted;
    if (isLive) {
      const { updateTagCounts } = await import("../lib/tagUpdateHelper");
      await updateTagCounts(this.tags, -1, "wheelCount");
    }
  } catch (err) {
    console.error("Error in wheel post-remove hook:", err);
  }
});

const Wheel = models.Wheel || mongoose.model("Wheel", wheelSchema);

export default Wheel;
