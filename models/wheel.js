import mongoose, { Schema, models } from "mongoose";

const wheelSchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    data:  {
      type: [String],
      default: [],
      required: true
    }, // Array of wordDataObjects
    createdBy: {
      type: String,
      required: true
    } //includes email of user who created the list
    // userId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true
    // }
  },
  {
    timestamps: true,
  }
);

const Wheel = models.Wheel || mongoose.model("Wheel", wheelSchema);

export default Wheel;