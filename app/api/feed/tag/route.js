import { NextResponse } from "next/server";
import { getFeedItems } from "@lib/feedService";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const lastTimestamp = searchParams.get("cursor"); 

    if (!tag) {
      return NextResponse.json({ error: "tag is required" }, { status: 400 });
    }

    const allItems = await getFeedItems({ 
      tag, 
      limit: limit + 1, 
      lastTimestamp 
    });
    
    const items = allItems.slice(0, limit);
    const nextCursor = allItems.length > limit ? allItems[limit - 1].createdAt : null;

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