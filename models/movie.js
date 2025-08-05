import mongoose, { Schema, models } from "mongoose";

const MovieSchema = new Schema(
  {
    tmdbId: { type: Number, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: {
      original: String,
      localized: String,
    },
    wheels: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    tags: [String],
  },
  { timestamps: true }
);

const Movie = models.Movie || mongoose.model("Movie", MovieSchema);
export default Movie;
