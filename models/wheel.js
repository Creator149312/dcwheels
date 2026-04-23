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
    // Tags are lowercased + trimmed on save so that:
    //   1) equal-match queries can fully use the `tags: 1` index
    //      (case-insensitive regex can't).
    //   2) there's one canonical form per tag, preventing "Anime" vs "anime"
    //      from fragmenting results on /tags/[tagId].
    // NOTE: existing pre-normalisation data should be backfilled with:
    //   db.wheels.updateMany({}, [{ $set: { tags: { $map: { input: "$tags",
    //     as: "t", in: { $toLower: "$$t" } } } } }])
    tags: {
      type: [String],
      default: [],
      set: (tags) =>
        Array.isArray(tags)
          ? tags.map((t) => (typeof t === "string" ? t.toLowerCase().trim() : t))
          : tags,
    },
    //new field Added Related To
    //
    // Many-to-many association between a wheel and the TopicPages it is
    // "about". A "GTA or Need for Speed Picker" wheel has two entries
    // here — one per game. This replaces the earlier single-parent
    // `relatedTo` field; see scripts/migrate-relatedTo-to-relatedTopics.mjs
    // for the one-shot backfill that converted existing documents.
    //
    // Entries:
    //   { type: "game" | "anime" | "movie" | "character" | "custom",
    //     id:   external API id (string) or TopicPage _id (string) }
    //
    // `_id: false` keeps each sub-doc id-free — we never query individual
    // array elements by their own _id, only by {type, id}.
    relatedTopics: {
      type: [
        {
          type: {
            type: String,
            enum: ["anime", "movie", "game", "character", "custom"],
          },
          id: String,
          _id: false,
        },
      ],
      default: [],
    }, //end of relatedTopics
    editorData: {
      type: Object,
      default: {
        advOptions: false,
      },
    },
    wheelPreview: { type: String, default: null },
    // viewCount intentionally omitted — view tracking lives in WheelAnalytics.view_count
    // (bot-filtered, no auth required — a more accurate signal than auth-only visit logs)
    likeCount: { type: Number, default: 0 }, // denormalized from Reaction; kept here for fast index-based sorting
  },
  {
    timestamps: true,
  }
);

wheelSchema.index({ title: 1, createdBy: 1 }, { unique: true }); // Existing unique index, to keep a check on datastorage

// New indexes for performance improvements 
wheelSchema.index({ tags: 1 }); // speeds up $match on tags 
wheelSchema.index({ createdAt: -1 }); // speeds up sorting by recency
wheelSchema.index({ likeCount: -1 }); // speeds up popular by likes
wheelSchema.index({ wheelPreview: 1 }); // speeds up admin filter for missing previews
// Profile page + dashboard both run `find({ createdBy }).sort({ createdAt: -1 })`.
// The existing `{ title, createdBy }` index is prefixed by title and can't serve
// these queries; a dedicated compound turns them from collection scans into
// bounded index scans as the per-user wheel count grows.
wheelSchema.index({ createdBy: 1, createdAt: -1 });
// Multikey index on the topic associations. Serves TopicPage → related
// wheels lookups (e.g. Wheel.find({ relatedTopics: { $elemMatch: {type, id} } }))
// without a collection scan once the wheels collection gets large.
wheelSchema.index({ "relatedTopics.type": 1, "relatedTopics.id": 1 });

const Wheel = models.Wheel || mongoose.model("Wheel", wheelSchema);

export default Wheel;
