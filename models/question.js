import mongoose, { Schema, models } from "mongoose";

const QuestionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["yesno", "multi", "open"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 300,
    },
    contentType: {
      type: String,
      enum: ["movie", "anime", "game"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    options: [{ type: String, trim: true }], // For yesno/multi
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // still useful for reactions

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Question = models.Question || mongoose.model("Question", QuestionSchema);
export default Question;
