import mongoose, { Schema, models } from "mongoose";

//It instantly communicates that each page is centered around a specific topic,
// whether it's anime, movies, games, science, or even custom discussions like SquareTables.
// It also aligns beautifully with your platform’s vision of being a decision-first, community-driven space.
const TopicPageSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["anime", "movie", "game", "character", "custom"],
      required: true,
    },
    source: {
      type: String,
      enum: ["Anilist", "TMDB", "RAWG"],
      required: function () {
        return this.type !== "custom";
      },
    },
    relatedId: {
      type: Schema.Types.Mixed, // Number for external APIs, ObjectId for internal pages
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      romaji: String, // anime
      english: String, // anime
      native: String, // anime
      original: String, // movie
      localized: String, // movie
      default: String, // fallback or display title
    },
    cover: String, // shared across all types
    description: String, // shared across all types
    wheels: {
      type: Number,
      default: 0,
    },
    // Flexible reaction counters (denormalized)
    // Using Map lets you add new reactions without schema changes
    reactions: {
      type: Map,
      of: Number,
      default: { like: 0 },
    },
    followers: { type: Number, default: 0 },
    tags: {
      type: [String],
      default: [],
      set: (tags) => tags.map((tag) => tag.toLowerCase().trim()),
    },
    details: {
      studio: String, // anime
      episodes: Number, // anime
      director: String, // movie
      runtime: Number, // movie
      releaseYear: Number, // shared
      platform: String, // game
      host: String, // custom
      theme: String, // custom
    },
    // Recommendations (optional if you added earlier)
    // recommendations: {
    //   external: { type: Number, default: null },
    //   count: { type: Number, default: 0 },
    //   total: { type: Number, default: 0 },
    //   average: { type: Number, default: 0 },
    // },
  },
  { timestamps: true }
);
const TopicPage =
  models.TopicPage || mongoose.model("TopicPage", TopicPageSchema);
export default TopicPage;
