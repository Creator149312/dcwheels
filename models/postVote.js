import mongoose, { Schema, models } from "mongoose";

/**
 * PostVote — tracks user votes on post polls
 * Prevents duplicate votes and records voting history
 */
const postVoteSchema = new Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent multiple votes by the same user on a single post
postVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

const PostVote = models.PostVote || mongoose.model("PostVote", postVoteSchema);

export default PostVote;
