/**
 * lib/contentDiff.js
 *
 * Fast, pure Jaccard-distance similarity utility for measuring originality
 * between a parent entity (wheel/list) and a remixed/forked derivative.
 *
 * Used by the Canonical Fork Filter to prevent near-duplicate remakes
 * from wasting Google crawl budget or causing duplicate content penalties.
 */

/**
 * Normalizes an array of items or wheel segments into an array of clean strings.
 *
 * Handles:
 * - Plain strings: "Option A"
 * - Objects: { name, text, word, label, title }
 * - HTML-embedded items: strips tags like `<img ...>`
 */
function normalizeItemLabels(items) {
  if (!Array.isArray(items)) return [];

  const labels = [];
  for (const it of items) {
    if (!it) continue;

    let raw = "";
    if (typeof it === "string") {
      raw = it;
    } else if (typeof it === "object") {
      raw = it.name || it.text || it.word || it.label || it.title || "";
    }

    if (typeof raw === "string" && raw.length > 0) {
      // Strip any HTML tags (e.g. legacy embedded images)
      const clean = raw.replace(/<[^>]+>/g, "").trim().toLowerCase();
      if (clean.length > 0) {
        labels.push(clean);
      }
    }
  }

  return labels;
}

/**
 * Calculates the difference ratio (0.0 to 1.0) between original items and remixed items.
 *
 * Formula:
 *   Difference Ratio = 1 - (Intersection / Union)
 *
 * Interpretations:
 *   0.0  => Identical (zero items added/removed/changed)
 *   0.30 => 30% modified (The Originality Threshold for Canonical Fork Filter)
 *   1.0  => 100% completely new items
 *
 * @param {Array} originalItems - Items/segments from the parent wheel/list
 * @param {Array} newItems      - Items/segments in the remixed wheel/list
 * @returns {number} Ratio between 0.0 and 1.0 (rounded to 2 decimal places)
 */
export function calculateDiffRatio(originalItems = [], newItems = []) {
  const setOriginal = new Set(normalizeItemLabels(originalItems));
  const setNew = new Set(normalizeItemLabels(newItems));

  if (setOriginal.size === 0 && setNew.size === 0) return 0;
  if (setOriginal.size === 0 || setNew.size === 0) return 1;

  let matches = 0;
  for (const item of setNew) {
    if (setOriginal.has(item)) {
      matches++;
    }
  }

  const unionSize = new Set([...setOriginal, ...setNew]).size;
  if (unionSize === 0) return 0;

  const diff = 1 - (matches / unionSize);
  return Math.round(diff * 100) / 100;
}
