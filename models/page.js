import mongoose, { Schema, models } from "mongoose";

//the following data is mainly used for pages which are indexed /wheels
const pageSchema = new Schema(
  {
    title: { type: String, required: true },
    description: {
      type: String,
      required: true,
    },
    content: [{ type: Object, default: {} }],
    slug: { type: String, required: true, unique: true },
    indexed: { type: Boolean, default: false },
    wheel: { type: Schema.Types.ObjectId, ref: "Wheel" },
  },
  {
    timestamps: true,
  }
);

const Page = models.Page || mongoose.model("Page", pageSchema);

export default Page;
