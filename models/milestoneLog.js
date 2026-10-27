import mongoose, { Schema, models } from "mongoose";

/**
 * MilestoneLogSchema
 *
 * Tracks reached interaction milestones so an email is NEVER sent twice
 * for the same threshold on any entity (wheel, post, list).
 *
 * Key compound index ensures unique: (entityId, entityType, milestoneType, threshold)
 */
const milestoneLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["wheel", "post", "list"],
      required: true,
    },
    milestoneType: {
      type: String,
      enum: ["LIKE", "COMMENT", "SPIN"],
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee idempotency and avoid duplicate emails
milestoneLogSchema.index(
  { entityId: 1, milestoneType: 1, threshold: 1 },
  { unique: true }
);

const MilestoneLog =
  models.MilestoneLog || mongoose.model("MilestoneLog", milestoneLogSchema);

export default MilestoneLog;
