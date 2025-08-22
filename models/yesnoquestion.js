import mongoose, { Schema, models } from "mongoose";

const YesNoQuestionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['yes_no'],
      default: 'yes_no',
    },
    relatedTo: {
      type: {
        type: String,
        enum: ['anime', 'movie', 'game', 'sport', 'food'],
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
    },
    responses: {
      yes: {
        type: Number,
        default: 0,
      },
      no: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt fields
  }
);

const YesNoQuestion = models.YesNoQuestion || mongoose.model("YesNoQuestion", YesNoQuestionSchema);
export default YesNoQuestion;
