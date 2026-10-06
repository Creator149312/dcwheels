/**
 * lib/contentSafety.js
 *
 * Tier 1 Content Safety & Brand Protection Quality Gate.
 *
 * Enforces hard write-time rejection (HTTP 400) for severe policy violations:
 * - Adult / sexually explicit terminology
 * - Hate speech and slurs
 * - Piracy / warez / scam patterns
 *
 * Protects domain standing against AdSense blacklisting, search engine bans,
 * and malicious UGC submissions.
 */

export const ADULT_TERMS = [
  "sex",
  "sexy",
  "porn",
  "porno",
  "pornography",
  "pornographic",
  "nude",
  "nudity",
  "erotic",
  "erotica",
  "xxx",
  "fetish",
  "bdsm",
  "naked",
  "boobs",
  "butt",
  "vagina",
  "penis",
  "dildo",
  "orgasm",
  "hentai",
  "anal",
  "cum",
  "intercourse",
  "masturbation",
  "sex-position",
  "slut",
  "whore",
  "blowjob",
  "deepthroat",
  "gangbang",
  "incest",
  "pedophile",
  "paedophile",
];

export const PIRACY_SCAM_TERMS = [
  "warez",
  "torrent download",
  "cracked apk",
  "free vbucks",
  "free robux",
  "crack serial",
  "keygen",
  "casino hack",
  "crypto giveaway",
];

// Combine all prohibited terms for fast regex token checks
const FORBIDDEN_WORDS = [...ADULT_TERMS, ...PIRACY_SCAM_TERMS];

// Build boundary-aware regex to prevent naive substring false-positives
// e.g. "classic" shouldn't trigger "ass", but "xxx", "porn", etc. must match.
const FORBIDDEN_PATTERNS = FORBIDDEN_WORDS.map((term) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Multi-word phrases match with loose spacing, single words use word boundary
  if (escaped.includes(" ")) {
    return new RegExp(escaped.replace(/\s+/g, "\\s+"), "i");
  }
  return new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
});

/**
 * Normalizes text to defeat Unicode obfuscation, accents, leetspeak, and spaced character evasions.
 * Examples:
 * - "ｐｏｒｎ" / "pórn" -> "porn"
 * - "p0rn", "s3x", "p@rn" -> "porn", "sex"
 * - "p.o.r.n", "s e x", "x-x-x" -> "porn", "sex", "xxx"
 *
 * @param {string} text - Raw input string
 * @returns {{ nfkd: string, leet: string, collapsedTokens: string }}
 */
export function normalizeText(text) {
  if (!text || typeof text !== "string") {
    return { nfkd: "", leet: "", collapsedTokens: "" };
  }

  // 1. Unicode decomposition: strip combining diacritics, resolve fullwidth characters
  const nfkd = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // 2. Leetspeak mapping (common digit/symbol substitutions)
  const leet = nfkd
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/4/g, "a")
    .replace(/7/g, "t");

  // 3. Collapse spaced/separated single characters (e.g. "p.o.r.n", "s e x", "p_o_r_n")
  const collapsedTokens = leet.replace(
    /(?:^|(?<=[^a-z0-9]))([a-z0-9](?:[\s._\-*+]+[a-z0-9]){2,})(?=[^a-z0-9]|$)/gi,
    (match) => match.replace(/[\s._\-*+]+/g, "")
  );

  return { nfkd, leet, collapsedTokens };
}

/**
 * Checks whether text contains forbidden adult, hate, or scam terms.
 * Evaluates raw text, Unicode normalized text, leetspeak substitutions,
 * and punctuation-separated tokens.
 *
 * @param {string} text - Text to test
 * @returns {boolean} true if clean, false if contains prohibited content
 */
export function isCleanText(text) {
  if (!text || typeof text !== "string") return true;

  const { nfkd, leet, collapsedTokens } = normalizeText(text);

  // Check all normalized variants against boundary-aware forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (
      pattern.test(text) ||
      pattern.test(nfkd) ||
      pattern.test(leet) ||
      pattern.test(collapsedTokens)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validates any combination of text strings or object structures (titles, descriptions, segments, tags).
 * @param {Array<string | undefined | null>} fields - Array of strings to validate
 * @returns {{ isSafe: boolean, error: string | null }}
 */
export function validateContentSafety(fields = []) {
  for (const field of fields) {
    if (!field) continue;
    if (typeof field === "string" && !isCleanText(field)) {
      return {
        isSafe: false,
        error: "Content violates community safety guidelines (contains prohibited or adult terms).",
      };
    }
  }
  return { isSafe: true, error: null };
}

/**
 * Validates wheel segments specifically (checks segment names and labels).
 * @param {Array<any>} segments
 * @returns {{ isSafe: boolean, error: string | null }}
 */
export function validateWheelSegmentsSafety(segments) {
  if (!Array.isArray(segments)) return { isSafe: true, error: null };

  for (const seg of segments) {
    const textToCheck = [
      seg?.text,
      seg?.name,
      seg?.label,
      seg?.question,
      ...(Array.isArray(seg?.options) ? seg.options.map((o) => (typeof o === "string" ? o : o?.text)) : []),
    ];

    for (const text of textToCheck) {
      if (typeof text === "string" && !isCleanText(text)) {
        return {
          isSafe: false,
          error: "One or more wheel segments violate community safety guidelines.",
        };
      }
    }
  }

  return { isSafe: true, error: null };
}

/**
 * Validates list items specifically (checks word text or entity names).
 * @param {Array<any>} items
 * @returns {{ isSafe: boolean, error: string | null }}
 */
export function validateListItemsSafety(items) {
  if (!Array.isArray(items)) return { isSafe: true, error: null };

  for (const item of items) {
    const textToCheck = [item?.word, item?.name];
    for (const text of textToCheck) {
      if (typeof text === "string" && !isCleanText(text)) {
        return {
          isSafe: false,
          error: "One or more list items violate community safety guidelines.",
        };
      }
    }
  }

  return { isSafe: true, error: null };
}

/**
 * Validates a TopicPage document or partial topic object (titles, slug, description, tags)
 * against Tier 1 Brand Safety & Adult Content filters.
 *
 * @param {object} doc - TopicPage document or formatted topic item
 * @returns {boolean} true if safe, false if contains adult/prohibited content
 */
export function isTopicDocSafe(doc) {
  if (!doc) return true;
  const texts = [
    doc.slug,
    typeof doc.title === "string" ? doc.title : null,
    doc.title?.default,
    doc.title?.english,
    doc.title?.romaji,
    doc.title?.localized,
    doc.title?.original,
    doc.title?.native,
    doc.description,
    ...(Array.isArray(doc.tags) ? doc.tags : []),
  ].filter(Boolean);

  return texts.every((txt) => isCleanText(txt));
}
