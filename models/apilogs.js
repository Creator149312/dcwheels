import mongoose, { Schema, models } from "mongoose";

const apiLogSchema = new Schema(
  {
    userId: {
      type: String, // or ObjectId if you have a User model
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    promptTokens: {
      type: Number,
      required: true,
    },
    completionTokens: {
      type: Number,
      required: true,
    },
    // totalTokens: {
    //   type: Number,
    //   required: true,
    // },
    // costEstimate: {
    //   type: Number, // store in USD or your currency
    //   required: true,
    // },
    responseId: {
      type: String, // optional: OpenAI response ID
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const ApiLog = models.ApiLog || mongoose.model("ApiLog", apiLogSchema);

export default ApiLog;
