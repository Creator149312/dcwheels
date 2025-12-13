import mongoose, { Schema, models } from "mongoose";

const ListItemSchema = new Schema(
  {
    entityType: { type: String, enum: ["movie", "anime", "game", "character"], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true }, // canonical reference
    name: { type: String, required: true },   // cached title
    slug: { type: String, required: true },   // cached slug for route (/movie/123-inception)
    image: { type: String },                  // cached poster/cover URL
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ListSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true }, // e.g. "Favorites", "Watch Later"
    description: { type: String },
    items: { type: [ListItemSchema], default: [] },
  },
  { timestamps: true }
);

// Ensure unique list names per user
ListSchema.index({ userId: 1, name: 1 }, { unique: true });

const SaveList = models.SaveList || mongoose.model("SaveList", ListSchema);

export default SaveList;
