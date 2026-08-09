import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import TopicPage from "@models/topicpage";
import { NextResponse } from "next/server";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";
import {
  runTopicAtlasSearch,
  runTopicRegexSearch,
  formatTopic,
} from "@lib/search/topicSearch";
import {
  runWheelAtlasSearch,
  runWheelRegexSearch,
  formatWheel,
} from "@lib/search/wheelSearch";

/**
 * GET /api/wheel/suggest?query=naruto
 *
 * Unified autosuggest for wheels + topic pages. Uses Atlas Search on the
 * local database only (no external APIs). Regex fallback covers wheels or
 * topics if Atlas Search returns nothing.
 */
const WHEEL_LIMIT = 3;
const TOPIC_LIMIT = 5;
const MAX_SUGGESTIONS = WHEEL_LIMIT + TOPIC_LIMIT;

export async function GET(request) {
  const ip = getIpFromRequest(request);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/wheel/suggest");
  if (limited) return rateLimitResponse(retryAfter);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { suggestions: [], error: "Query must be at least 3 characters." },
      { status: 400 }
    );
  }

  await connectMongoDB();

  try {
    const q = query.trim();

    // Atlas Search first.
    let [wheelDocs, topicDocs] = await Promise.all([
      runWheelAtlasSearch(Wheel, q, WHEEL_LIMIT),
      runTopicAtlasSearch(TopicPage, q, TOPIC_LIMIT),
    ]);

    // Regex fallback if either corpus is empty.
    if (wheelDocs.length === 0) {
      wheelDocs = await runWheelRegexSearch(Wheel, q, WHEEL_LIMIT);
    }
    if (topicDocs.length === 0) {
      topicDocs = await runTopicRegexSearch(TopicPage, q, TOPIC_LIMIT);
    }

    const suggestions = [
      ...wheelDocs.map(formatWheel),
      ...topicDocs.map((t) => ({
        ...formatTopic(t),
        route: `/${t.type}/${t.slug}`,
      })),
    ].slice(0, MAX_SUGGESTIONS);

    return NextResponse.json({ suggestions, error: null }, { status: 200 });
  } catch (error) {
    console.error("Suggest error:", error);
    return NextResponse.json(
      { suggestions: [], error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
