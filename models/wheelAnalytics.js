import mongoose, { Schema, models } from "mongoose";

//the following data is mainly used for wheelAnalyticss which are indexed /wheels
const wheelAnalyticsSchema = new Schema(
  {
    view_count: { type: Number, required: true, default: 0 },
    spin_count: { type: Number, required: true, default: 0 },
    // likes and dislikes are tracked via the Reaction model (Wheel.likeCount is the denormalized cache)
    wheel: {
      type: Schema.Types.ObjectId,
      ref: "Wheel",
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

wheelAnalyticsSchema.index({ view_count: -1 });
wheelAnalyticsSchema.index({ spin_count: -1 });

const WheelAnalytics = models.WheelAnalytics || mongoose.model("WheelAnalytics", wheelAnalyticsSchema);

export default WheelAnalytics;
