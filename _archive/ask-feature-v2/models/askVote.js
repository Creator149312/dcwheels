import mongoose, { Schema, models } from "mongoose";

const askVoteSchema = new Schema(
  {
    askDilemmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AskDilemma",
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
    rationale: {
      // Optional short comment explaining the vote — drives social engagement
      type: String,
      maxlength: 280,
    },
  },
  { timestamps: true }
);

// Prevent multiple votes by the same user on a single dilemma
askVoteSchema.index({ askDilemmaId: 1, userId: 1 }, { unique: true });

const AskVote = models.AskVote || mongoose.model("AskVote", askVoteSchema);

export default AskVote;
