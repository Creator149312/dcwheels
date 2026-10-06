import { NextResponse } from "next/server";
import { getFeedItemsSafe } from "@lib/feedService";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const cursor = searchParams.get("cursor"); 
    const type = searchParams.get("type"); 
    const externalId = searchParams.get("externalId"); 
    const tag = searchParams.get("tag"); 
    const userId = searchParams.get("userId"); 
    const docType = searchParams.get("docType"); 

    let showPrivate = false;
    if (userId) {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        await connectMongoDB();
        const targetUser = await User.findById(userId).select("email").lean();
        if (targetUser && targetUser.email === session.user.email) {
          showPrivate = true;
        }
      }
    }

    // Request limit+1 to know if there are more items. Safe wrapper degrades
    // to an empty array on error instead of returning a 500 to the client.
    const allItems = await getFeedItemsSafe({ 
      type, 
      externalId, 
      tag, 
      userId, 
      docType, 
      limit: limit + 1, 
      cursor,
      showPrivate
    });
    
    // Return only the first 'limit' items to client
    const items = allItems.slice(0, limit);
    
    // Cursor = first undisplayed post/wheel (cursor match is inclusive).
    const nextItem = allItems.slice(limit).find((i) => (i._docType || i.docType) !== "list") || null;
    const isCatCursor = cursor && cursor.startsWith("cat|");
    const cursorParts = cursor ? cursor.split("|") : [];
    const currentListOffset = isCatCursor
      ? (parseInt(cursorParts[3], 10) || 0)
      : (parseInt(cursorParts[2], 10) || 0);
    const hasListInPage = items.some(i => i.docType === "list" || i._docType === "list");
    const nextListOffset = currentListOffset + (hasListInPage ? 1 : 0);

    let nextCursor = null;
    if (nextItem) {
      const isNextCat = nextItem._feedStage === "cat" || isCatCursor;
      const stagePrefix = isNextCat ? "cat|" : "";
      nextCursor = `${stagePrefix}${nextItem.createdAt}|${nextItem._id || nextItem.id}|${nextListOffset}`;
    }

    const res = NextResponse.json({ 
      items, 
      nextCursor,
      hasMore: !!nextCursor 
    });

    // Cache at the CDN edge for 30 s; serve stale for up to 60 s while revalidating.
    // Shared (public) feed only - no user-specific data in this response.
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );

    return res;
  } catch (err) {
    console.error("Feed fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}