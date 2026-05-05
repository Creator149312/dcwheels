import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import WheelAnalytics from "@models/wheelAnalytics";

const BOT_UA_REGEX =
  /(bot|crawler|spider|crawling|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|discordbot|slackbot|telegrambot|embedly|quora link preview|pinterest|google-structured-data-testing-tool|bingpreview)/i;

function isLikelyBot(ua = "") {
  if (!ua) return true;
  return BOT_UA_REGEX.test(ua);
}

function isPrefetch(headersLike) {
  const purpose = headersLike.get("purpose") || "";
  const xPurpose = headersLike.get("x-purpose") || "";
  const secPurpose = headersLike.get("sec-purpose") || "";
  const nextRouterPrefetch = headersLike.get("next-router-prefetch") || "";

  return (
    purpose.toLowerCase() === "prefetch" ||
    xPurpose.toLowerCase() === "prefetch" ||
    secPurpose.toLowerCase() === "prefetch" ||
    nextRouterPrefetch === "1"
  );
}

export function shouldTrackView(headersLike) {
  const ua = headersLike.get("user-agent") || "";
  return !isLikelyBot(ua) && !isPrefetch(headersLike);
}

async function ensureValidWheelId(wheelId) {
  if (!wheelId || !mongoose.Types.ObjectId.isValid(wheelId)) {
    throw new Error("Invalid wheelId");
  }
}

export async function incrementWheelViewCount(wheelId, inc = 1) {
  await ensureValidWheelId(wheelId);
  await connectMongoDB();

  // `inc` lets the caller scale the increment when client-side sampling is
  // in use (see ViewTracker SAMPLE_RATE). Defaults to 1 so all existing
  // call sites keep their previous behaviour.
  const safeInc = Math.max(1, Math.min(10, Number(inc) || 1));

  await WheelAnalytics.findOneAndUpdate(
    { wheel: wheelId },
    {
      $inc: { view_count: safeInc },
      $setOnInsert: { spin_count: 0 },
    },
    { upsert: true, new: true }
  );
}

export async function incrementWheelSpinCount(wheelId, segmentLabel = null) {
  await ensureValidWheelId(wheelId);
  await connectMongoDB();

  // Build the update doc. We always bump spin_count + lastSpunAt; we only
  // bump segmentHits.<key> when the caller supplies a label. Older clients
  // that don't send a label still get total-spin tracking (back-compat).
  const inc = { spin_count: 1 };
  const set = { lastSpunAt: new Date() };

  const key = sanitizeSegmentKey(segmentLabel);
  if (key) {
    // Mongoose Map field — dotted path is the canonical way to $inc one key
    // without rewriting the whole map.
    inc[`segmentHits.${key}`] = 1;
  }

  await WheelAnalytics.findOneAndUpdate(
    { wheel: wheelId },
    {
      $inc: inc,
      $set: set,
      $setOnInsert: { view_count: 0 },
    },
    { upsert: true, new: true }
  );
}

// Sanitize a raw segment label into a Mongo-safe Map key.
//  - trim + collapse internal whitespace
//  - cap at 100 chars (prevents abuse / index bloat)
//  - replace `.` and `$` (forbidden in Mongo field paths) with `_`
//  - return null for empty / non-string inputs so callers can no-op cleanly
function sanitizeSegmentKey(label) {
  if (typeof label !== "string") return null;
  const trimmed = label.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100).replace(/[.$]/g, "_");
}

export async function getWheelAnalytics(wheelId) {
  await ensureValidWheelId(wheelId);
  await connectMongoDB();

  const analytics = await WheelAnalytics.findOne({ wheel: wheelId })
    .select("view_count spin_count segmentHits lastSpunAt")
    .lean();

  return {
    view_count: analytics?.view_count || 0,
    spin_count: analytics?.spin_count || 0,
    lastSpunAt: analytics?.lastSpunAt || null,
    topSegments: extractTopSegments(analytics?.segmentHits, 5),
  };
}

// Convert the raw segmentHits map (object after .lean()) into a sorted,
// truncated array of `{label, count, percentage}` for the public stats UI.
// Returns [] for fresh wheels so the component can render a "no data yet"
// empty state instead of crashing on undefined.
export function extractTopSegments(segmentHits, limit = 5) {
  if (!segmentHits) return [];
  // After .lean(), Map fields come through as plain objects.
  const entries = Object.entries(segmentHits);
  if (entries.length === 0) return [];

  const total = entries.reduce((sum, [, n]) => sum + (Number(n) || 0), 0);
  if (total <= 0) return [];

  return entries
    .map(([label, count]) => ({
      label,
      count: Number(count) || 0,
      percentage: Math.round(((Number(count) || 0) / total) * 1000) / 10, // 1 decimal
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
