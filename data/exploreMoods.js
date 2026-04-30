// data/exploreMoods.js
//
// Curated "moods" for the Explore page (similar to YouTube Music's mood &
// genre chips). Each mood maps to a set of canonical lowercase tags that
// already exist on Wheel documents. Keep slugs URL-safe (lowercase, no
// spaces) — they're used in `/explore?mood=<slug>`.
//
// To add a mood: append an entry, ensure each `tags` value matches the
// lowercased `tags` field on Wheel docs (Wheel schema lowercases on save).

export const EXPLORE_MOODS = [
  { slug: "all",        label: "All",        emoji: "✨", tags: [] },
  { slug: "trending",   label: "Trending",   emoji: "🔥", tags: [] },
  { slug: "party",      label: "Party",      emoji: "🎉", tags: ["party", "drinks", "fun", "truth-or-dare"] },
  { slug: "food",       label: "Food",       emoji: "🍔", tags: ["food", "restaurants", "cuisine", "dinner", "lunch", "breakfast"] },
  { slug: "decisions",  label: "Decisions",  emoji: "🤔", tags: ["decision", "choice", "yes-no", "random", "picker"] },
  { slug: "couples",    label: "Couples",    emoji: "💕", tags: ["couples", "date", "love", "relationship", "romance"] },
  { slug: "kids",       label: "Kids",       emoji: "🧒", tags: ["kids", "children", "family"] },
  { slug: "numbers",    label: "Numbers",    emoji: "🔢", tags: ["numbers", "lottery", "random-number"] },
  { slug: "names",      label: "Names",      emoji: "🏷️", tags: ["names", "name", "raffle"] },
  { slug: "workout",    label: "Workout",    emoji: "💪", tags: ["workout", "exercise", "fitness", "yoga"] },
  { slug: "anime",      label: "Anime",      emoji: "🌸", tags: ["anime", "manga"] },
  { slug: "movies",     label: "Movies",     emoji: "🎬", tags: ["movies", "film", "cinema"] },
  { slug: "games",      label: "Games",      emoji: "🎮", tags: ["games", "videogames", "gaming"] },
  { slug: "education",  label: "Learning",   emoji: "📚", tags: ["education", "learning", "study", "trivia"] },
];

export function getMoodBySlug(slug) {
  if (!slug) return EXPLORE_MOODS[0];
  return EXPLORE_MOODS.find((m) => m.slug === slug) || EXPLORE_MOODS[0];
}
