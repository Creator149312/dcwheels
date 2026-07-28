import mongoose from "mongoose";
const { Schema, models } = mongoose;

const ListItemSchema = new Schema(
  {
    // { _id: false } below suppresses Mongoose's automatic _id; we re-add it
    // explicitly with `auto: true` so each item still gets a unique ObjectId
    // (needed for PATCH /items/[itemId] and DELETE /items/[itemId] lookups)
    // but we fully control the field definition.
    _id: {
      type: Schema.Types.ObjectId,
      auto: true,
    },

    type: {
      type: String,
      enum: ["word", "entity"],
      required: true,
    },

    // WORD ITEM FIELDS
    word: { type: String, trim: true },
    wordData: { type: String }, // CDN URL only — base64 must be uploaded before save

    // ENTITY ITEM FIELDS
    entityType: {
      type: String,
      enum: ["movie", "anime", "game", "character", "wheel", "uwheel"],
    },
    entityId: { type: Schema.Types.Mixed },
    name: { type: String, trim: true },
    slug: { type: String, trim: true },
    image: { type: String },

    // Tracks the user's progress with this entity (binary system).
    // "want"  — saved, not yet consumed
    // "done"  — consumed / completed
    // Wheels don't use status (null is valid).
    // Default "want" keeps all existing documents valid without a migration.
    status: {
      type: String,
      enum: ["want", "in-progress", "done"],  // ← Still accept legacy values for backward compat
      default: "want",
    },

    addedAt: { type: Date, default: Date.now },
  },
  { _id: false } // suppresses auto _id — we define it explicitly above
);


// Optional: validation to enforce required fields per type
ListItemSchema.pre("validate", function (next) {
  if (this.type === "word") {
    if (!this.word) return next(new Error("word is required for word items"));
  }

  if (this.type === "entity") {
    if (!this.entityType || !this.entityId || !this.name || !this.slug) {
      return next(new Error("entityType, entityId, name, slug are required for entity items"));
    }
  }

  next();
});

const ListSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Final canonical name
    name: { type: String, required: true, trim: true, maxlength: 100 },

    description: { type: String, default: "", trim: true, maxlength: 300 },

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
                      .replace(/\s+/g, "-") // spaces → hyphens
                      .replace(/[^a-z0-9-]/g, "") // strip non-url chars
                      .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
                  : t
              )
              .filter(Boolean) // drop any tags that normalised to empty string
          : tags,
    },

    items: {
      type: [ListItemSchema],
      default: [],
      validate: {
        validator: function(arr) {
          // System lists (e.g. My Library) have a much higher limit to act as a primary backlog.
          // Custom user lists remain capped at 100 to encourage curation.
          const limit = this.isSystem ? 2000 : 100;
          return arr.length <= limit;
        },
        message: (props) => `List limit reached. System lists support up to 2000 items, custom lists 100.`,
      },
    },

    // When true, unauthenticated users can read this list via GET /api/unifiedlist/[id].
    // Defaults false so existing lists stay private until the owner opts in.
    // DEPRECATED: Kept for backward compat. Use settings.visibility instead.
    isPublic: { type: Boolean, default: false },

    // SYSTEM FLAGS (Optimization for TopicPages)
    // Helps identify default lists regardless of their display name.
    isSystem: { type: Boolean, default: false },
    systemKey: { type: String, trim: true },

    // List-level settings: sort order, visibility, etc.
    // Applied to all lists (both system and custom)
    settings: {
      // Sort order for display
      // "recently-saved" — newest items first
      // "alphabetical"   — A→Z by name
      // "status"         — want first, then done
      // "entity-type"    — group by type
      sortBy: {
        type: String,
        enum: ["recently-saved", "alphabetical", "status", "entity-type"],
        default: "recently-saved",
      },

      // Visibility: who can see this list
      // "private"  — only owner
      // "public"   — anyone with link (public profile)
      visibility: {
        type: String,
        enum: ["private", "public"],
        default: "public",
      },
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

// Indexes
ListSchema.index({ userId: 1, name: 1 }, { unique: true });
// Enforce unique system keys per user (e.g. only one SYS_SAVED list)
ListSchema.index(
  { userId: 1, systemKey: 1 }, 
  { unique: true, partialFilterExpression: { systemKey: { $exists: true } } }
);

// Powers GET /api/unifiedlist/by-entity — checks whether a user already has
// a given entity saved in any of their lists. Without this, Mongo scans every
// list document for the user to find a matching items.entityId.
// Multikey index: Mongo expands the items array automatically.
ListSchema.index({ userId: 1, "items.entityId": 1 });
ListSchema.index({ tags: 1 });

/**
 * Mongoose Hooks for Tag Count Automation
 * 
 * Logic: A list only counts towards tag discovery if:
 * 1. isSystem: false (don't index auto-generated library lists)
 * 2. visibility: 'public' OR isPublic: true
 */
ListSchema.pre("save", async function (next) {
  // Generate SEO-friendly slug from list name
  if (this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
  }

  if (!this.isNew) {
    try {
      const oldDoc = await this.constructor
        .findById(this._id)
        .select("tags settings isPublic isSystem")
        .lean();
      if (oldDoc) {
        this._oldState = {
          tags: oldDoc.tags || [],
          isPublic: oldDoc.isPublic === true || oldDoc.settings?.visibility === "public",
          isSystem: !!oldDoc.isSystem
        };
      }
    } catch (err) {
      console.error("Error fetching old state in list pre-save:", err);
    }
  }
  next();
});

ListSchema.post("save", async function () {
  try {
    const { updateTagCounts } = await import("../lib/tagUpdateHelper");

    const wasLive = this._oldState
      ? !this._oldState.isSystem && this._oldState.isPublic
      : false;
    
    const isLive = !this.isSystem && (this.isPublic === true || this.settings?.visibility === "public");

    if (!wasLive && isLive) {
      await updateTagCounts(this.tags, 1, "listCount");
    } else if (wasLive && !isLive) {
      await updateTagCounts(this._oldState.tags, -1, "listCount");
    } else if (wasLive && isLive) {
      const oldTags = this._oldState.tags || [];
      const added = this.tags.filter((t) => !oldTags.includes(t));
      const removed = oldTags.filter((t) => !this.tags.includes(t));

      if (added.length > 0) await updateTagCounts(added, 1, "listCount");
      if (removed.length > 0) await updateTagCounts(removed, -1, "listCount");
    }
  } catch (err) {
    console.error("Error in list post-save hook:", err);
  }
});

ListSchema.post("remove", async function () {
  try {
    const isLive = !this.isSystem && (this.isPublic === true || this.settings?.visibility === "public");
    if (isLive) {
      const { updateTagCounts } = await import("../lib/tagUpdateHelper");
      await updateTagCounts(this.tags, -1, "listCount");
    }
  } catch (err) {
    console.error("Error in list post-remove hook:", err);
  }
});

const UnifiedList = models.UnifiedList || mongoose.model("UnifiedList", ListSchema);
export default UnifiedList;
