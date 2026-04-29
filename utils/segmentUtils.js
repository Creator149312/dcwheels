/**
 * Segment normalizer — ensures every segment has { id, text, type, image, payload }.
 * Backward-compatible: old segments ({ text, image? }) get id/type/payload added.
 * New segments pass through unchanged.
 */

function getUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Infer segment type from existing fields.
 */
function inferType(seg) {
  if (seg.question || seg.options || seg.payload?.question) return "quiz";
  if (
    seg.entityType ||
    seg.entityId ||
    seg.payload?.entityType ||
    seg.payload?.entityId
  )
    return "entity";
  if (seg.image) return "image";
  return "basic";
}

/**
 * Normalize a single segment to the canonical shape.
 * Keeps text, image, color, weight, visible at top level.
 * Moves type-specific extras into payload.
 */
export function normalizeSegment(seg) {
  if (!seg || typeof seg !== "object") return null;

  // Already normalized — has id and type
  if (seg.id && seg.type) return seg;

  // Legacy migration: older wheels stored images as raw HTML inside `text`,
  // e.g. text = '<img src="data:image/png;base64,...">Mario'. Lift the image
  // out so SegmentListEditor's thumbnail + advanced-mode rendering both work,
  // and the user doesn't see raw HTML in the text input.
  let migratedText = seg.text || "";
  let migratedImage = seg.image || null;
  if (
    !migratedImage &&
    typeof migratedText === "string" &&
    migratedText.includes("<img")
  ) {
    const m = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i.exec(migratedText);
    if (m && m[1]) {
      migratedImage = m[1];
      migratedText = migratedText.replace(m[0], "").trim();
    }
  }

  const type = seg.type || inferType({ ...seg, image: migratedImage });
  const payload = seg.payload || {};

  // Migrate type-specific fields into payload if not already there
  if (type === "quiz") {
    if (seg.question && !payload.question) payload.question = seg.question;
    if (seg.options && !payload.options) payload.options = seg.options;
    if (seg.correctIndex != null && payload.correctIndex == null)
      payload.correctIndex = seg.correctIndex;
  }

  if (type === "entity") {
    if (seg.entityType && !payload.entityType) payload.entityType = seg.entityType;
    if (seg.entityId && !payload.entityId) payload.entityId = seg.entityId;
    if (seg.slug && !payload.slug) payload.slug = seg.slug;
  }

  return {
    id: seg.id || getUUID(),
    text: migratedText,
    type,
    image: migratedImage,
    payload,
    // Preserve rendering fields if present
    ...(seg.color != null && { color: seg.color }),
    ...(seg.weight != null && { weight: seg.weight }),
    ...(seg.visible != null && { visible: seg.visible }),
    ...(seg.imageLandscape != null && { imageLandscape: seg.imageLandscape }),
    // Keep quiz fields at top level for backward compat with existing consumers
    ...(seg.question != null && { question: seg.question }),
    ...(seg.options != null && { options: seg.options }),
    ...(seg.correctIndex != null && { correctIndex: seg.correctIndex }),
    // Entity fields live exclusively in `payload` — top-level duplication
    // was dropped to halve storage on entity wheels. WinnerPopup already
    // reads `payload.entityType` first, with top-level as a defensive
    // fallback for any in-flight legacy segments.
  };
}

/**
 * Normalize an array of segments. Filters out invalid entries.
 */
export function normalizeSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments.map(normalizeSegment).filter(Boolean);
}

/**
 * Create a new blank segment with proper structure.
 */
export function createSegment(text = "New", overrides = {}) {
  return {
    id: getUUID(),
    text,
    type: "basic",
    image: null,
    payload: {},
    weight: 1,
    visible: true,
    ...overrides,
  };
}
