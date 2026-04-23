import mongoose, { Schema, models } from "mongoose";

const QuestionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["yesno", "multi", "open"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 300,
    },
    contentType: {
      type: String,
      enum: ["movie", "anime", "game", "character", "wheel"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Slug of the parent TopicPage (e.g. "1539104-jujutsu-kaisen")
    // Used as an additional tag for cross-content discovery
    contentSlug: { type: String, default: null },

    // Tags copied from parent TopicPage at creation time (+ derived slug tag)
    // Enables tag-based cross-collection matching without joins
    tags: { type: [String], default: [] },

    options: [{ type: String, trim: true }], // For yesno/multi
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // still useful for reactions

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fast tag-based lookups
QuestionSchema.index({ tags: 1 });
// Index for fast contentId lookups (related questions via TopicPage chain)
QuestionSchema.index({ contentId: 1, createdAt: -1 });

const Question = models.Question || mongoose.model("Question", QuestionSchema);
export default Question;
