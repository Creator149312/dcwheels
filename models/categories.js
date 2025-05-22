import mongoose, { Schema, models } from "mongoose";

const categoriesSchema = new Schema(
  {
    category: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Category =
  models.Category || mongoose.model("Category", categoriesSchema);

export default Category;
