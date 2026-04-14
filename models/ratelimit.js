import mongoose, { Schema, models } from "mongoose";

const rateLimitSchema = new Schema({
  key: { type: String, required: true, index: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

const RateLimit = models.RateLimit || mongoose.model("RateLimit", rateLimitSchema);
export default RateLimit;
