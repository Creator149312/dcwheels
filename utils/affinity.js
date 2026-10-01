/**
 * useAffinity — lightweight localStorage tracker for fandom affinities.
 *
 * Records which categories (anime / movie / game / character) a user engages
 * with, so the global feed can shift toward their interests (warm state)
 * while keeping a permanent discovery floor to avoid echo chambers.
 *
 * Storage: localStorage["affinity:v1"] = { anime: 3, game: 7, ... }
 * Guests and logged-in users both tracked — login is not required.
 */

const KEY = "affinity:v1";
const CATEGORIES = ["anime", "movie", "game", "character"];

// Weight per interaction type — a vote/save signals stronger interest than a view
const WEIGHTS = {
  view: 1,
  vote: 3,
  spin: 2,
  save: 3,
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const out = {};
    for (const c of CATEGORIES) out[c] = Number(parsed[c]) || 0;
    return out;
  } catch {
    return { anime: 0, movie: 0, game: 0, character: 0 };
  }
}

function write(scores) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {}
}

/**
 * Record an interaction with a category.
 * @param {"anime"|"movie"|"game"|"character"} category
 * @param {"view"|"vote"|"spin"|"save"} kind
 */
export function trackAffinity(category, kind = "view") {
  if (!CATEGORIES.includes(category)) return;
  const scores = read();
  scores[category] += WEIGHTS[kind] ?? 1;
  write(scores);
}

/**
 * Compute each category's share of total affinity (0..1).
 * Returns null when there's no meaningful signal yet (cold start).
 */
export function getAffinityShares() {
  const scores = read();
  const total = CATEGORIES.reduce((s, c) => s + scores[c], 0);
  // Require a minimum signal before personalizing — avoids over-fitting to
  // a single accidental click.
  if (total < 3) return null;

  const shares = {};
  for (const c of CATEGORIES) shares[c] = scores[c] / total;
  return shares;
}
