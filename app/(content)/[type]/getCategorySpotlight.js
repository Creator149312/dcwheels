import { unstable_cache } from "next/cache";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";

const SPOTLIGHT_REVALIDATE = 604800; // 7 days

// Configure your fixed slugs / URLs here for each category
export const SPOTLIGHT_SLUGS = {
  game: [
    "415171-valorant",
    "779-roblox",
    "22509-minecraft",
    "415-clash-royale",
  ],
  anime: [
    "20-naruto",
    "21355-re-zero-kara-hajimeru-isekai-seikatsu",
    "127230-chainsaw-man",
    "113415-jujutsu-kaisen",
  ],
  character: [
    "17-naruto-uzumaki",
    "246-gokuu-son",
    "40-luffy-monkey",
    "127691-satoru-gojou",
  ],
  movie: [
    "969681-spider-man-brand-new-day",
    "1153576-street-fighter",
    "1058424-hope",
    "1248832-digger",

    // Add your 4 movie slugs here (e.g. from TopicPage DB)
  ],
};

function pickString(value) {
  // TopicPage fields like title can be stored as objects ({ default, english, ... })
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return (
      value.default ||
      value.english ||
      value.romaji ||
      value.localized ||
      value.original ||
      ""
    );
  }
  return String(value);
}

function formatTopic(doc, type) {
  const title = pickString(doc.title);
  const likes = doc.reactions?.like || 0;
  const ratingAvg =
    doc.rating?.count > 0
      ? Math.round((doc.rating.totalScore / doc.rating.count) * 10) / 10
      : null;

  return {
    id: String(doc.relatedId || doc._id),
    name: title,
    title,
    slug: pickString(doc.slug),
    image: pickString(doc.cover),
    coverImage: pickString(doc.cover),
    description: pickString(doc.description),
    subtitle: doc.details?.releaseYear ? String(doc.details.releaseYear) : "",
    genre: Array.isArray(doc.tags) && doc.tags.length > 0 ? doc.tags[0] : "",
    rating: ratingAvg,
    // Live engagement signals that actually exist on TopicPage docs
    postsCount: 0,
    wheelsCount: doc.wheels || 0,
    listsCount: 0,
    likesCount: likes,
    followersCount: doc.followers || 0,
    type,
  };
}

async function _fetchSpotlightUncached(type) {
  await connectMongoDB();

  const targetSlugs = SPOTLIGHT_SLUGS[type];
  if (!targetSlugs || targetSlugs.length === 0) return [];

  // Helper: if someone pastes a full path like "/game/415171-valorant" or "415171-valorant", clean it to just the slug
  const cleanSlugs = targetSlugs.map((s) => s.replace(/^\/[^/]+\//, "").trim());

  try {
    const docs = await TopicPage.find({
      type,
      slug: { $in: cleanSlugs },
    })
      .select(
        "title slug cover description tags details wheels followers reactions rating relatedId",
      )
      .lean();

    // Map to our format
    const formatted = docs.map((doc) => formatTopic(doc, type));

    // Sort by live engagement (highest first), preserving curated order on ties
    const originalOrder = new Map(cleanSlugs.map((s, i) => [s, i]));
    const score = (t) =>
      (t.wheelsCount || 0) + (t.followersCount || 0) + (t.likesCount || 0);
    formatted.sort((a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return (
        (originalOrder.get(a.slug) ?? 0) - (originalOrder.get(b.slug) ?? 0)
      );
    });

    return formatted;
  } catch (err) {
    console.error(`[Spotlight] Error fetching ${type} spotlight:`, err);
    return [];
  }
}

export const getCachedSpotlight = unstable_cache(
  _fetchSpotlightUncached,
  ["category-top-spotlight-v8"],
  { revalidate: SPOTLIGHT_REVALIDATE, tags: ["category-top-spotlight"] },
);
