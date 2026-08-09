import mongoose, { Schema, models } from "mongoose";

const CommentSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The content type this comment belongs to
    entityType: {
      type: String,
      enum: ["post", "question", "page", "wheel", "uwheel", "list", "topicpage"],
      required: true,
      index: true,
    },

    // The specific entity ID
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // The actual comment text
    text: { type: String, required: true },

    // Optional: for threaded replies
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  { timestamps: true }
);

// Single index covers:
//   1) Top-level comment listings: { entityType, entityId, parentCommentId: null, createdAt }
//   2) Reply lookups by parent:    { parentCommentId: <id>, createdAt }
//   3) Entity-level reverse-chronological feed
// Replaces the previous separate { entityType, entityId, createdAt } and
// { parentCommentId } indexes with one compound that serves both paths.
CommentSchema.index({ entityType: 1, entityId: 1, parentCommentId: 1, createdAt: -1 });

const Comment =
  models.Comment || mongoose.model("Comment", CommentSchema);

export default Comment;
