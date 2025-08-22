import mongoose, { Schema, models } from "mongoose";

const ReactionSchema = new Schema(
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
    reaction: { type: String, required: true }, // e.g., "like", "heart", "excited"
  },
  { timestamps: true }
);

// Enforce 1 active reaction per user per content
ReactionSchema.index({ userId: 1, contentId: 1 }, { unique: true });

// If you later want to allow multiple different reactions from the same user on the same content,
// change the unique index to include reaction: index({ userId: 1, contentId: 1, reaction: 1 }, { unique: true })

const Reaction = models.Reaction || mongoose.model("Reaction", ReactionSchema);
export default Reaction;
