import mongoose, { Schema, models } from "mongoose";

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

    // Tracks the user's progress with this entity.
    // "want"        — added to list, not yet started
    // "in-progress" — currently watching / playing
    // "done"        — finished
    // Default "want" keeps all existing documents valid without a migration.
    status: {
      type: String,
      enum: ["want", "in-progress", "done"],
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

    items: {
      type: [ListItemSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 100,
        message: "A list cannot exceed 100 items. Upgrade to Pro for higher limits.",
      },
    },

    // When true, unauthenticated users can read this list via GET /api/unifiedlist/[id].
    // Defaults false so existing lists stay private until the owner opts in.
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique list name per user
ListSchema.index({ userId: 1, name: 1 }, { unique: true });

// Powers GET /api/unifiedlist/by-entity — checks whether a user already has
// a given entity saved in any of their lists. Without this, Mongo scans every
// list document for the user to find a matching items.entityId.
// Multikey index: Mongo expands the items array automatically.
ListSchema.index({ userId: 1, "items.entityId": 1 });

const UnifiedList = models.UnifiedList || mongoose.model("UnifiedList", ListSchema);
export default UnifiedList;
