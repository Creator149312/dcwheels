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
      required: false,
      default: null,
      index: true,
    },
    guestId: {
      type: String,
      required: false,
      default: null,
      trim: true,
      index: true,
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate votes:
// 1) By the same registered user on a post (sparse allows docs where userId is null)
postVoteSchema.index({ postId: 1, userId: 1 }, { unique: true, sparse: true });
// 2) By the same anonymous guest on a post (sparse allows docs where guestId is null)
postVoteSchema.index({ postId: 1, guestId: 1 }, { unique: true, sparse: true });

const PostVote = models.PostVote || mongoose.model("PostVote", postVoteSchema);

export default PostVote;
