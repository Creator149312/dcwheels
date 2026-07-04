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
    // The vote value: 1 for Yes, 0 for No (or could be 1-5 for rating later)
    vote: {
      type: String,
      enum: ["yes", "no"],
      required: true,
    },
    // Future-proofing for star ratings
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure one vote per user per topic page
topicPageVoteSchema.index({ topicPageId: 1, userId: 1 }, { unique: true });

const TopicPageVote =
  models.TopicPageVote || mongoose.model("TopicPageVote", topicPageVoteSchema);
export default TopicPageVote;
