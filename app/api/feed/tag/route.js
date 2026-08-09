import { NextResponse } from "next/server";
import { getFeedItemsSafe } from "@lib/feedService";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const cursor = searchParams.get("cursor"); 

    if (!tag) {
      return NextResponse.json({ error: "tag is required" }, { status: 400 });
    }

    // Safe wrapper degrades to an empty array on error so the client sees
    // a clean end-of-feed rather than a 500.
    const allItems = await getFeedItemsSafe({ 
      tag, 
      limit: limit + 1, 
      cursor 
    });
    
    const items = allItems.slice(0, limit);
    const nextItem = allItems.length > limit ? allItems[limit] : null;
    const nextCursor = nextItem ? `${nextItem.createdAt}|${nextItem._id || nextItem.id}` : null;

    const res = NextResponse.json({ 
      items, 
      nextCursor,
      hasMore: !!nextCursor 
    });

    res.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );

    return res;
  } catch (err) {
    console.error("Tag feed fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}