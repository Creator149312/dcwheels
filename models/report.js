import mongoose, { Schema, models } from "mongoose";

/**
 * Report — community report against a post or comment.
 *
 * When reportCount on a target reaches AUTO_BAN_THRESHOLD (5),
 * the target author is automatically shadow-banned by the /api/report route.
 */
const ReportSchema = new Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    reason: {
      type: String,
      enum: ["spam", "harassment", "nsfw", "misinformation", "other"],
      required: true,
    },

    // Snapshot of content at the time of reporting (helpful for review)
    contentSnapshot: {
      type: String,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
      index: true,
    },

    // Admin note when reviewing
    adminNote: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent the same user from reporting the same target twice
ReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
// Admin queue — pending reports by date
ReportSchema.index({ status: 1, createdAt: -1 });

const Report = models.Report || mongoose.model("Report", ReportSchema);

export default Report;
