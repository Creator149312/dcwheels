import mongoose, { Schema, models } from "mongoose";

// Define the schema for the object inside the array
// we are using this type of schema so that we can add created associated list in future
// where we can have this type association {word <-> data related to word}
const wordDataObject = new mongoose.Schema(
  {
    word: String,
    wordData: String,
  },
  { _id: false }
);

const listSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    words: {
      type: [wordDataObject],
      default: [],
    }, // Array of wordDataObjects
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

listSchema.index({ title: 1, createdBy: 1 }, { unique: true });
// `/api/list/user/[createdBy]` runs `List.find({ createdBy }).sort(...)`. The
// unique compound above is prefixed by `title` and can't serve a query that
// filters only on `createdBy`, so without this dedicated index the dashboard
// list-fetch degrades to a collection scan once per-user list counts grow.
listSchema.index({ createdBy: 1, createdAt: -1 });

const List = models.List || mongoose.model("List", listSchema);

export default List;
