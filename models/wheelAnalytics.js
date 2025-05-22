import mongoose, { Schema, models } from "mongoose";

//the following data is mainly used for wheelAnalyticss which are indexed /wheels
const wheelAnalyticsSchema = new Schema(
  {
    views: { type: Number, required: true },
    likes: { type: Number, required: true },
    dislikes: { type: Number, required: true },
    wheel: { type: Schema.Types.ObjectId, ref: "Wheel" },
  },
  {
    timestamps: true,
  }
);

const WheelAnalytics = models.WheelAnalytics || mongoose.model("WheelAnalytics", wheelAnalyticsSchema);

export default WheelAnalytics;
