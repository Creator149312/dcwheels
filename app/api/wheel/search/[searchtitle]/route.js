import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";

export async function GET(request, { params }) {
  const ip = getIpFromRequest(request);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/wheel/search/");
  if (limited) return rateLimitResponse(retryAfter);

  const { searchtitle } = params;
  const { searchParams } = new URL(request.url);
  const start = parseInt(searchParams.get("start") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!searchtitle) {
    return NextResponse.json({ list: [], total: 0 }, { status: 200 });
  }

  // Decode safely — malformed percent-encoded input would otherwise throw
  // URIError and return 500. Length-cap protects the $search backend.
  let query;
  try {
    query = decodeURIComponent(searchtitle).slice(0, 200);
  } catch {
    query = searchtitle.slice(0, 200);
  }

  await connectMongoDB();

  try {
    // Single Atlas Search op: $facet splits results and total count into
    // one round-trip. Also projects `segmentCount` via $size so we never
    // ship full segment arrays — the UI only renders the count.
    const [agg] = await Wheel.aggregate([
      {
        $search: {
          index: "default",
          autocomplete: {
            query,
            path: "title",
          },
        },
      },
      {
        $facet: {
          results: [
            { $skip: start },
            { $limit: limit },
            {
              $project: {
                title: 1,
                slug: 1,
                segmentCount: { $size: { $ifNull: ["$data", []] } },
                score: { $meta: "searchScore" },
              },
            },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ]);

    const results = agg?.results ?? [];
    const total = agg?.meta?.[0]?.total ?? 0;

    // Back-compat: callers read `item.data.length`; expose a stub array of
    // the right length so existing UI code keeps working without changes.
    const list = results.map((r) => ({
      _id: r._id,
      title: r.title,
      slug: r.slug,
      score: r.score,
      segmentCount: r.segmentCount,
      data: { length: r.segmentCount },
    }));

    return NextResponse.json(
      { list, total },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wheels", list: [], total: 0 },
      { status: 500 }
    );
  }
}
