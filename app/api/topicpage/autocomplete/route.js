import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";
import {
  runTopicAtlasSearch,
  runTopicRegexSearch,
  formatTopic,
} from "@lib/search/topicSearch";

/**
 * GET /api/topicpage/autocomplete?q=naruto
 *
 * Returns topic-page suggestions using Atlas Search first, then regex
 * fallback. Fetches from the local database only — no external APIs.
 */
const LIMIT = 10;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ topics: [] });
    }

    await connectMongoDB();

    let docs = [];

    try {
      docs = await runTopicAtlasSearch(TopicPage, q.trim(), LIMIT);
    } catch (err) {
      console.warn("Topic autocomplete Atlas Search failed:", err.message);
    }

    if (docs.length === 0) {
      docs = await runTopicRegexSearch(TopicPage, q.trim(), LIMIT);
    }

    return NextResponse.json({ topics: docs.map(formatTopic) });
  } catch (err) {
    console.error("Topic autocomplete error:", err);
    return NextResponse.json({ topics: [], error: "Search failed" }, { status: 500 });
  }
}
