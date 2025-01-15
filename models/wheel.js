import mongoose, { Schema, models } from "mongoose";

const wheelSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    data: {
      type: [String],
      default: [],
      required: true,
    }, // Array of wordDataObjects
    createdBy: {
      type: String,
      required: true,
    },
    wheelData: { type: Object, default: {} },
  },
  {
    timestamps: true,
  }
);

const Wheel = models.Wheel || mongoose.model("Wheel", wheelSchema);

export default Wheel;
