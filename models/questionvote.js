import mongoose, { Schema, models } from "mongoose";

const QuestionVoteSchema = new Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    optionIndex: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Enforce one vote per user per question
QuestionVoteSchema.index({ questionId: 1, userId: 1 }, { unique: true });

const QuestionVote =
  models.QuestionVote || mongoose.model("QuestionVote", QuestionVoteSchema);

export default QuestionVote;
