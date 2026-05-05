// models/follow.js
import mongoose, { Schema, models } from "mongoose";

const FollowSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entityId: {
      // Supports ObjectId entities (user/topicpage/group) and string entities
      // like canonical tag slugs (e.g. "movies", "sci-fi").
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ["group", "user", "topicpage", "tag"],
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate follows by same user on same entity
FollowSchema.index(
  { userId: 1, entityId: 1, entityType: 1 },
  { unique: true }
);

const Follow = models.Follow || mongoose.model("Follow", FollowSchema);

export default Follow;
