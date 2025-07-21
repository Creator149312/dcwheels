import mongoose, { Schema, models } from "mongoose";

const tagSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. "Elections"
    //   slug: { type: String, required: true, unique: true }, // e.g. "elections"
    //   description: { type: String },
    //   thumbnailUrl: { type: String },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Tag = models.Tag || mongoose.model("Tag", tagSchema);
export default Tag;
