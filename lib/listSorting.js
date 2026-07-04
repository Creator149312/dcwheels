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
export function sortListItems(items, sortBy = "recently-saved") {
  if (!Array.isArray(items) || items.length === 0) return items;

  const sorted = [...items]; // Don't mutate original

  switch (sortBy) {
    case "recently-saved":
      // Newest first (most recent addedAt)
      return sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    case "alphabetical":
      // A → Z by item name
      return sorted.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
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
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
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
    "recently-saved": "Recently Saved",
    alphabetical: "Alphabetical (A→Z)",
    status: "Status (Want → Done)",
    "entity-type": "By Type",
  };
  return labels[sortBy] || "Recently Saved";
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
 * Supports both legacy isPublic and new settings.visibility.
 *
 * @param {Object} list - List document
 * @returns {boolean} Whether list is public
 */
export function isListPublic(list) {
  if (!list) return false;
  // New way: check settings.visibility
  if (list.settings?.visibility === "public") return true;
  // Legacy: check isPublic (for backward compat)
  if (list.isPublic === true) return true;
  return false;
}
