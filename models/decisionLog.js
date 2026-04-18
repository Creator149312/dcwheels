import mongoose, { Schema, models } from "mongoose";

const DecisionLogSchema = new Schema(
  {
    userId: { type: String, index: true, required: true },
    wheelId: { type: String, required: true },
    wheelTitle: { type: String, default: "" },
    result: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

DecisionLogSchema.index({ userId: 1, createdAt: -1 });

const DecisionLog =
  models.DecisionLog || mongoose.model("DecisionLog", DecisionLogSchema);
export default DecisionLog;
