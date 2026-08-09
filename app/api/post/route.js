import { NextResponse } from "next/server";
import { getPublicPosts } from "@lib/posts";

/**
 * GET /api/post?limit=20&cursor=...&tag=anime&hasPoll=true
 * Cursor-paginated public posts
 * @param hasPoll - Filter to only posts with polls (optional)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || 20;
    const cursor = searchParams.get("cursor") || null;
    const tag = searchParams.get("tag") || null;
    const hasPoll = searchParams.get("hasPoll") === "true";

    const result = await getPublicPosts({
      limit: Number(limit),
      cursor,
      tag,
      hasPoll,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/post error:", err);
    return NextResponse.json({ message: err.message || "Failed to fetch posts" }, { status: 500 });
  }
}
