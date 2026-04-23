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

// Dedupe query in /api/history/visit: findOne({ userId, wheelId }).sort({ visitedAt: -1 })
// Without this compound index, the query degrades to a collection scan at scale.
VisitSchema.index({ userId: 1, wheelId: 1, visitedAt: -1 });

// TTL: auto-expire visits older than 90 days. The collection is append-heavy
// (every wheel view writes a row) and at 1M MAU grows by several million
// docs/month. The only consumers are the history surface (90d is already
// further back than users realistically browse) and the dashboard stats
// query, which is bounded separately. Letting the driver reap old rows
// keeps the index small and the working set in RAM.
// Note: adding a TTL to an existing field is an online operation, but
// Atlas may take a while on a large existing collection.
VisitSchema.index({ visitedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const Visit = models.Visit || mongoose.model("Visit", VisitSchema);
export default Visit;
