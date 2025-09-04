import mongoose, { Schema, models } from "mongoose";

const ReviewSchema = new Schema(
  {
    // Which type of content this review belongs to: 'movie', 'anime', 'game', etc.
    type: {
      type: String,
      required: true,
      enum: ["movie", "anime", "game"], // extend as needed
    },

    // The ID of the content item (e.g., movie ID, anime ID)
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "type", // dynamic reference if you have separate collections
    },

    // User who wrote the review
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Whether the user recommends this content
    recommend: {
      type: Boolean,
      required: true,
    },

    // The actual review text
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },

    // Optional: numeric rating (1–5 stars, etc.)
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // Optional: track likes/upvotes for social proof
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Optional: track reports for moderation
    reports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Review = models.Review || mongoose.model("Review", ReviewSchema);

export default Review;