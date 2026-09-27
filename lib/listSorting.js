/**
 * listSorting.js
 * ──────────────
 * Utilities for sorting list items based on different criteria.
 * Applied server-side in API responses and client-side in UI.
 */

/**
 * Sort items based on the list's sortBy setting.
 *
 * @param {Array} items - Array of list items
 * @param {string} sortBy - Sort method: "recently-saved" | "alphabetical" | "status" | "entity-type"
 * @returns {Array} Sorted items
 */
export function sortListItems(items, sortBy = "custom") {
  if (!Array.isArray(items) || items.length === 0) return items;

  const sorted = [...items]; // Don't mutate original

  switch (sortBy) {
    case "custom":
      // Explicit order (items array order / item.rank)
      return sorted;

    case "recently-saved":
      // Newest first (most recent addedAt)
      return sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    case "alphabetical":
      // A → Z by item name
      return sorted.sort((a, b) => {
        const nameA = ((a.type === "word" ? a.word : a.name) || "").toLowerCase();
        const nameB = ((b.type === "word" ? b.word : b.name) || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    case "status":
      // want first, then done, then by entity type
      return sorted.sort((a, b) => {
        const statusOrder = { want: 0, done: 1, "in-progress": 2 };
        const statusA = statusOrder[a.status] ?? 2;
        const statusB = statusOrder[b.status] ?? 2;

        if (statusA !== statusB) return statusA - statusB;

        // Then by entity type for secondary sorting
        const typeA = a.entityType || "";
        const typeB = b.entityType || "";
        return typeA.localeCompare(typeB);
      });

    case "entity-type":
      // Group by entity type (alphabetically), then by name within type
      return sorted.sort((a, b) => {
        const typeA = a.entityType || "";
        const typeB = b.entityType || "";

        if (typeA !== typeB) {
          return typeA.localeCompare(typeB);
        }

        // Same type: sort by name
        const nameA = ((a.type === "word" ? a.word : a.name) || "").toLowerCase();
        const nameB = ((b.type === "word" ? b.word : b.name) || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    default:
      return sorted;
  }
}

/**
 * Get sort label for UI display.
 *
 * @param {string} sortBy - Sort method
 * @returns {string} Human-readable label
 */
export function getSortLabel(sortBy) {
  const labels = {
    custom: "Custom / Ranked",
    "recently-saved": "Recently Saved",
    alphabetical: "Alphabetical (A→Z)",
    status: "Status (Want → Done)",
    "entity-type": "By Type",
  };
  return labels[sortBy] || "Custom / Ranked";
}

/**
 * Get visibility label for UI display.
 *
 * @param {string} visibility - "private" | "public"
 * @returns {string} Human-readable label
 */
export function getVisibilityLabel(visibility) {
  const labels = {
    private: "Private",
    public: "Public",
  };
  return labels[visibility] || "Private";
}

/**
 * Check if list is publicly visible.
 * Uses isPublic as the single source of truth.
 *
 * @param {Object} list - List document
 * @returns {boolean} Whether list is public
 */
export function isListPublic(list) {
  if (!list) return false;
  return list.isPublic ?? true;
}
