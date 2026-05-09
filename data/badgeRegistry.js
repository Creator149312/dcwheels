/**
 * Badge registry — the authoritative list of all badge definitions.
 * Each badge has a slug that matches `Challenge.badgeSlug` and `UserBadge.badgeSlug`.
 *
 * icon: emoji used everywhere (simple, no image files needed)
 * color: Tailwind background color class for the badge chip
 */
export const BADGE_REGISTRY = {
  // ── Anime ───────────────────────────────────────────────────────────────
  "anime-first-episode": {
    slug: "anime-first-episode",
    title: "First Episode",
    icon: "🎌",
    color: "bg-pink-100 dark:bg-pink-900/30",
    textColor: "text-pink-700 dark:text-pink-300",
    borderColor: "border-pink-300 dark:border-pink-700",
    tier: "common",
    entityType: "anime",
    description: "Watched the first episode of a spun anime.",
  },
  "anime-genre-explorer": {
    slug: "anime-genre-explorer",
    title: "Genre Explorer",
    icon: "🗺️",
    color: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-300 dark:border-blue-700",
    tier: "rare",
    entityType: "anime",
    description: "Explored 3 different anime genres.",
  },
  "anime-marathoner": {
    slug: "anime-marathoner",
    title: "Anime Marathoner",
    icon: "🏅",
    color: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-700",
    tier: "epic",
    entityType: "anime",
    description: "Completed 7 consecutive days of anime spins.",
  },

  // ── Movies ──────────────────────────────────────────────────────────────
  "movie-night": {
    slug: "movie-night",
    title: "Movie Night",
    icon: "🎬",
    color: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-300",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    tier: "common",
    entityType: "movie",
    description: "Watched a movie decided by the wheel.",
  },
  "cinephile": {
    slug: "cinephile",
    title: "Cinephile",
    icon: "🍿",
    color: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-300 dark:border-orange-700",
    tier: "rare",
    entityType: "movie",
    description: "Watched movies across 3 different genres.",
  },
  "film-buff": {
    slug: "film-buff",
    title: "Film Buff",
    icon: "🏆",
    color: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-700",
    tier: "epic",
    entityType: "movie",
    description: "Watched a movie every day for a week.",
  },

  // ── Games ───────────────────────────────────────────────────────────────
  "backlog-buster": {
    slug: "backlog-buster",
    title: "Backlog Buster",
    icon: "🎮",
    color: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-300",
    borderColor: "border-green-300 dark:border-green-700",
    tier: "common",
    entityType: "game",
    description: "Played a game chosen by the wheel.",
  },
  "game-hopper": {
    slug: "game-hopper",
    title: "Game Hopper",
    icon: "🕹️",
    color: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-300 dark:border-blue-700",
    tier: "rare",
    entityType: "game",
    description: "Played games across 3 different genres.",
  },
  "completionist": {
    slug: "completionist",
    title: "Completionist",
    icon: "💎",
    color: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-700",
    tier: "epic",
    entityType: "game",
    description: "Gamed every day for a week via the wheel.",
  },

  // ── Characters ──────────────────────────────────────────────────────────
  "character-pick": {
    slug: "character-pick",
    title: "Character Pick",
    icon: "✨",
    color: "bg-pink-100 dark:bg-pink-900/30",
    textColor: "text-pink-700 dark:text-pink-300",
    borderColor: "border-pink-300 dark:border-pink-700",
    tier: "common",
    entityType: "character",
    description: "Chose a character from the wheel and learned about them.",
  },

  // ── Generic ─────────────────────────────────────────────────────────────
  "decision-maker": {
    slug: "decision-maker",
    title: "Decision Maker",
    icon: "⚡",
    color: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-300 dark:border-gray-600",
    tier: "common",
    entityType: "",
    description: "Made a decision with the help of the wheel.",
  },
};

/**
 * Get a badge definition by slug. Falls back to a generic unknown badge.
 */
export function getBadge(slug) {
  return (
    BADGE_REGISTRY[slug] || {
      slug,
      title: slug,
      icon: "🎖️",
      color: "bg-gray-100 dark:bg-gray-800",
      textColor: "text-gray-700 dark:text-gray-300",
      borderColor: "border-gray-300 dark:border-gray-600",
      tier: "common",
      entityType: "",
      description: "",
    }
  );
}

export const TIER_META = {
  common: { label: "Common", color: "text-green-600 dark:text-green-400", ring: "ring-green-400" },
  rare:   { label: "Rare",   color: "text-blue-600  dark:text-blue-400",  ring: "ring-blue-400" },
  epic:   { label: "Epic",   color: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500" },
};
