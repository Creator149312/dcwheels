import { NextResponse } from "next/server";
import { getGlobalFeedItems } from "@lib/spinStories";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const cursor = searchParams.get("cursor"); // lastTimestamp

    // Request limit+1 to know if there are more items
    const allItems = await getGlobalFeedItems(limit + 1, cursor);
    
    // Return only the first 'limit' items to client
    const items = allItems.slice(0, limit);
    
    // Set cursor to (limit+1)th item if it exists
    const nextCursor = allItems.length > limit ? allItems[limit - 1].createdAt : null;

    return NextResponse.json({ 
      items,
      nextCursor,
      hasMore: !!nextCursor
    });
  } catch (err) {
    console.error("Global feed fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}