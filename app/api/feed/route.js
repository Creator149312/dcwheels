import { NextResponse } from "next/server";
import { getFeedItems } from "@lib/feedService";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const lastTimestamp = searchParams.get("cursor"); 
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

    // Request limit+1 to know if there are more items
    const allItems = await getFeedItems({ 
      type, 
      externalId, 
      tag, 
      userId, 
      docType, 
      limit: limit + 1, 
      lastTimestamp,
      showPrivate
    });
    
    // Return only the first 'limit' items to client
    const items = allItems.slice(0, limit);
    
    // Set cursor to (limit+1)th item if it exists
    const nextCursor = allItems.length > limit ? allItems[limit - 1].createdAt : null;

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