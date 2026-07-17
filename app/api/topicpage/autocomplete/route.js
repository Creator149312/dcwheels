import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";

/**
 * GET /api/topicpage/autocomplete?q=naruto
 *
 * Returns prefix-matched topic pages for search/selection.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ topics: [] });
    }

    await connectMongoDB();

    // Search by title (all variants) or slug
    const topics = await TopicPage.find({
      $or: [
        { "title.english": { $regex: q, $options: "i" } },
        { "title.romaji": { $regex: q, $options: "i" } },
        { "title.original": { $regex: q, $options: "i" } },
        { "title.localized": { $regex: q, $options: "i" } },
        { "title.default": { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ],
    })
      .select("type relatedId title slug cover")
      .limit(10)
      .lean();

    const formatted = topics.map((t) => ({
      type: t.type,
      id: String(t.relatedId),
      title: t.title?.default || t.title?.english || t.title?.romaji || t.title?.original || t.slug,
      slug: t.slug,
      cover: t.cover,
    }));

    return NextResponse.json({ topics: formatted });
  } catch (err) {
    console.error("Topic autocomplete error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
