/**
 * Utilities to bridge and convert Wheel data / segments into List Draft format.
 */

const LS_DRAFT_KEY = "SpinpapaListDraft";
const IMAGES_LS_KEY = "SpinpapaWheelImages";

/**
 * Reconstitutes image data URLs from local storage image pool if split.
 */
function getCachedWheelImages() {
  if (typeof window === "undefined") return { images: {}, refs: {} };
  try {
    const raw = window.localStorage.getItem(IMAGES_LS_KEY);
    if (!raw) return { images: {}, refs: {} };
    const parsed = JSON.parse(raw);
    if (parsed && parsed.images && parsed.refs) return parsed;
    return { images: {}, refs: {} };
  } catch {
    return { images: {}, refs: {} };
  }
}

/**
 * Converts wheel segment array into unified list items.
 * Handles entity segments (anime, movie, character, etc.) and word/image segments.
 */
export function convertWheelSegmentsToListItems(segData = []) {
  if (!Array.isArray(segData)) return [];

  const { images, refs } = getCachedWheelImages();

  return segData
    .map((seg, idx) => {
      if (!seg) return null;

      // Extract text/title
      const title = (seg.text || seg.name || "").trim();
      const payload = seg.payload || {};

      // Resolve image: direct seg.image, or lookup by seg.id from refs
      let image = seg.image || "";
      if (!image && seg.id && refs && refs[seg.id] && images[refs[seg.id]]) {
        image = images[refs[seg.id]];
      }

      // Check if this is a catalog entity
      const entityType = seg.entityType || payload.entityType;
      const entityId = seg.entityId || payload.entityId;
      const slug = seg.slug || payload.slug;

      if (entityType && (entityId || title)) {
        return {
          draftId: `from-wheel-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          type: "entity",
          entityType,
          entityId: entityId || null,
          name: title || payload.name || "Untitled",
          slug: slug || "",
          image: image || payload.image || "",
          order: idx,
        };
      }

      // Otherwise standard word/custom item
      if (!title && !image) return null;

      return {
        draftId: `from-wheel-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        type: "word",
        word: title || "Option",
        wordData: image || "",
        order: idx,
      };
    })
    .filter(Boolean);
}

/**
 * Prepares and saves wheel data into the List draft localStorage key,
 * then returns the target URL (/lists/create).
 */
export function switchWheelToList({ segData = [], wheelData = {}, wheelTitle = "", wheelDescription = "" }) {
  if (typeof window === "undefined") return "/lists/create";

  try {
    const items = convertWheelSegmentsToListItems(segData);

    const listName =
      (wheelTitle && wheelTitle !== "Default Title" ? wheelTitle : "") ||
      (wheelData?.title && wheelData.title !== "Default Title" ? wheelData.title : "") ||
      "";

    const listDesc =
      (wheelDescription && wheelDescription !== "Default Description" ? wheelDescription : "") ||
      (wheelData?.description && wheelData.description !== "Default Description" ? wheelData.description : "") ||
      "";

    const listDraft = {
      name: listName,
      description: listDesc,
      format: "standard",
      tierConfig: [
        { key: "S", label: "S", color: "#EF4444" },
        { key: "A", label: "A", color: "#F97316" },
        { key: "B", label: "B", color: "#EAB308" },
        { key: "C", label: "C", color: "#10B981" },
        { key: "D", label: "D", color: "#3B82F6" },
      ],
      isPublic: true,
      items,
      updatedAt: Date.now(),
      source: "wheel-switch",
    };

    window.localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(listDraft));
  } catch (err) {
    console.error("Failed to convert wheel to list draft:", err);
  }

  return "/lists/create";
}
