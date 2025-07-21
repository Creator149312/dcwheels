import mongoose, { Schema, models } from "mongoose";

/**
 * title : used to display title at the tab of browser and to display heading in page
 * description: used to set description of page it is usually of length less than 125 words
 * data : is it the list data that is displayed in spinwheel and editor
 * createdBy : is the person who created the list
 * wheelData : is the wheel settings like theme of wheel, spin duration, number of segments to show on wheel etc.
 * content: is used to display content related to wheel in the page
 * category: is used to associate a category for a wheel
 * editorData: is data used to display editor with proper settings
 */

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
      type: [Object],
      default: [],
      required: true,
    }, // Array of wordDataObjects
    createdBy: {
      type: String,
      required: true,
    },
    wheelData: { type: Object, default: {} },
    tags: { type: [String], default: [] },
    // category: { type: String, default: "" }, //will remove it after migration
    editorData: {
      type: Object,
      default: {
        advOptions: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

wheelSchema.index({ title: 1, createdBy: 1 }, { unique: true });
const Wheel = models.Wheel || mongoose.model("Wheel", wheelSchema);

export default Wheel;
