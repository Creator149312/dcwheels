import mongoose, { Schema, models } from "mongoose";

const AnimeSchema = new Schema(
  {
    anilistId: {
      type: Number,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      romaji: { type: String, required: true },
      english: String,
      native: String,
    },
    wheels: {
      type: Number,
      default: 0,
    },
    followers: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    //   set: (tags) => tags.map((tag) => tag.toLowerCase()), // auto-lowercase
    },
  },
  { timestamps: true }
);

const Anime = models.Anime || mongoose.model("Anime", AnimeSchema);
export default Anime;
