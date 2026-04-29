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
    responseId: {
      type: String, // optional: OpenAI response ID
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Per-user usage queries ("show me my AI history" / admin abuse audits)
// scan by userId and sort by recency. Without this compound the query is
// a full collection scan + in-memory sort.
apiLogSchema.index({ userId: 1, createdAt: -1 });

const ApiLog = models.ApiLog || mongoose.model("ApiLog", apiLogSchema);

export default ApiLog;
