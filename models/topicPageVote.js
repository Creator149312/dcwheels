import mongoose, { Schema, models } from "mongoose";

/**
 * TopicPageVote — tracks user votes on Topic Pages (Worth It?)
 * Prevents duplicate votes and enables user-specific vote history.
 */
const topicPageVoteSchema = new Schema(
  {
    topicPageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TopicPage",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // DEPRECATED: Vote is now derived from rating at read time
    // Derived mapping: rating >= 4 = "yes", rating === 3 = "meh", rating <= 2 = "no"
    // Kept as optional for backward compatibility with existing data
    vote: {
      type: String,
      enum: ["yes", "no", "meh"],
      default: null,
    },
    // Star rating (1-5) — primary data source for vote derivation
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure one vote per user per topic page
topicPageVoteSchema.index({ topicPageId: 1, userId: 1 }, { unique: true });

const TopicPageVote =
  models.TopicPageVote || mongoose.model("TopicPageVote", topicPageVoteSchema);
export default TopicPageVote;
