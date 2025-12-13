import mongoose, { Schema, models } from "mongoose";

const ListItemSchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      auto: true, // ✅ auto-generate unique ID for each item
    },

    type: {
      type: String,
      enum: ["word", "entity"],
      required: true,
    },

    // WORD ITEM FIELDS
    word: { type: String },
    wordData: { type: String },

    // ENTITY ITEM FIELDS
    entityType: {
      type: String,
      enum: ["movie", "anime", "game", "character"],
    },
    entityId: { type: Schema.Types.ObjectId },
    name: { type: String },
    slug: { type: String },
    image: { type: String },

    addedAt: { type: Date, default: Date.now },
  },
  { _id: false } // ✅ keep this so parent doesn't create a second _id
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Final canonical name
    name: { type: String, required: true }, // e.g. Favorites, Watch Later, Vocabulary

    description: { type: String, default: "" },

    items: { type: [ListItemSchema], default: [] },
  },
  { timestamps: true }
);

// Unique list name per user
ListSchema.index({ userId: 1, name: 1 }, { unique: true });

const UnifiedList = models.UnifiedList || mongoose.model("UnifiedList", ListSchema);
export default UnifiedList;
