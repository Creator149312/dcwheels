import { NextResponse } from "next/server";
import { getPublicLists } from "@lib/lists";

// Public list feed. Keep this route because ListsClient's client-side
// "Load More" button calls it; server-side initial load bypasses HTTP and
// calls getPublicLists() directly.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

    const lists = await getPublicLists({ limit, skip });

    return NextResponse.json(
      { lists },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/unifiedlist/all error:", err);
    return NextResponse.json(
      { error: "Failed to fetch lists", details: err.message },
      { status: 500 }
    );
  }
}
