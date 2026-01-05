// models/Visit.ts
import mongoose, { Schema, models } from "mongoose";

const VisitSchema = new Schema(
  {
    userId: { type: String, index: true, required: true }, // auth user id or anonymous id
    wheelId: {
      type: Schema.Types.ObjectId,
      ref: "Wheel",
      index: true,
      required: true,
    },
    visitedAt: { type: Date, default: Date.now, index: true },
    // optional dedupe fingerprint fields:
    // pagePath: String, userAgent: String, ipHash: String
  },
  { timestamps: false }
);

// Helpful compound index for “recent visits per user”
VisitSchema.index({ userId: 1, visitedAt: -1 });

const Visit = models.Visit || mongoose.model("Visit", VisitSchema);
export default Visit;
