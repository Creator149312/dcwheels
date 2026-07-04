import { NextResponse } from "next/server";
import { getPublicPosts } from "@lib/posts";

/**
 * GET /api/post?limit=20&skip=0&tag=anime&hasPoll=true
 * Fetch paginated public posts
 * @param hasPoll - Filter to only posts with polls (optional)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || 20;
    const skip = searchParams.get("skip") || 0;
    const tag = searchParams.get("tag") || null;
    const hasPoll = searchParams.get("hasPoll") === "true";

    const posts = await getPublicPosts({ limit: Number(limit), skip: Number(skip), tag, hasPoll });

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("GET /api/post error:", err);
    return NextResponse.json({ message: err.message || "Failed to fetch posts" }, { status: 500 });
  }
}
