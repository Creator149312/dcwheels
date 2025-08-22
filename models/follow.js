import mongoose, { Schema, models } from "mongoose";

const FollowSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TopicPage",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["anime", "movie", "game", "custom"],
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate follows by same user
FollowSchema.index({ userId: 1, contentId: 1 }, { unique: true });
const Follow = models.Follow || mongoose.model("Follow", FollowSchema);
export default Follow;
