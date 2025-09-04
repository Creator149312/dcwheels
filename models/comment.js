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
      enum: ["post", "question", "page"],
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

// For fast lookups of all comments for an entity
CommentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const Comment =
  models.Comment || mongoose.model("Comment", CommentSchema);

export default Comment;
