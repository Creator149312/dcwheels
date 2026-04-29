import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";

// Cache popular list for 30 minutes at the CDN edge. Popular/trending
// rankings don't shift minute-to-minute, and the slow path (full $lookup
// against wheelanalytics) only runs once per cache miss — longer TTL = ~6×
// fewer DB hits per day with no perceptible UX change.
export const revalidate = 1800;

export async function GET(req) {
  try {
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = parseInt(searchParams.get("skip") || "0");
    const sort = searchParams.get("sort") || "popular"; // popular | views | likes | recent

    let sortQuery;
    switch (sort) {
      case "views":
        // view_count comes from WheelAnalytics via $addFields in the aggregate below
        sortQuery = { view_count: -1, createdAt: -1 };
        break;
      case "likes":
        // like_count is resolved from Wheel.likeCount via $addFields below
        sortQuery = { like_count: -1, createdAt: -1 };
        break;
      case "trending":
        sortQuery = { trending_score: -1, createdAt: -1 };
        break;
      case "recent":
        sortQuery = { createdAt: -1 };
        break;
      case "popular":
      default:
        // Composite score: spins weighted 3x + views + likes
        sortQuery = { trending_score: -1, createdAt: -1 };
        break;
    }

    // Fast paths for sort modes whose key lives on the Wheel document itself.
    // Skipping the $lookup against wheelanalytics turns an O(N) join over the
    // full collection into a bounded index scan + projection. The shape of
    // each returned wheel is kept identical to the aggregation path (analytics
    // counters default to 0) so the consuming React code is unaffected.
    if (sort === "recent" || sort === "likes") {
      const cursor = Wheel.find({}, {
        title: 1,
        description: 1,
        tags: 1,
        createdBy: 1,
        createdAt: 1,
        likeCount: 1,
      })
        .sort(
          sort === "likes"
            ? { likeCount: -1, createdAt: -1 }
            : { createdAt: -1 }
        )
        .skip(skip)
        .limit(limit)
        .lean();

      const docs = await cursor;
      const wheels = docs.map((w) => ({
        ...w,
        likeCount: w.likeCount || 0,
        view_count: 0,
        spin_count: 0,
        trending_score: 0,
      }));
      return NextResponse.json({ wheels }, { status: 200 });
    }

    const wheels = await Wheel.aggregate([
      {
        $lookup: {
          from: "wheelanalytics",
          localField: "_id",
          foreignField: "wheel",
          as: "analytics",
        },
      },
      {
        $lookup: {
          from: "wheelanalytics",
          localField: "_id",
          foreignField: "wheel",
          as: "analytics",
        },
      },
      {
        $addFields: {
          view_count: { $ifNull: [{ $arrayElemAt: ["$analytics.view_count", 0] }, 0] },
          spin_count: { $ifNull: [{ $arrayElemAt: ["$analytics.spin_count", 0] }, 0] },
          like_count: { $ifNull: ["$likeCount", 0] },
        },
      },
      {
        $addFields: {
          trending_score: {
            $add: [
              { $multiply: ["$spin_count", 3] },
              "$view_count",
              "$like_count",
            ],
          },
        },
      },
      { $sort: sortQuery },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          tags: 1,
          createdBy: 1,
          createdAt: 1,
          likeCount: "$like_count",
          view_count: 1,
          spin_count: 1,
          trending_score: 1,
        },
      },
    ]);

    return NextResponse.json({ wheels }, { status: 200 });
  } catch (err) {
    console.error("GET /api/wheels/popular error:", err);
    return NextResponse.json(
      { error: "Failed to fetch popular wheels" },
      { status: 500 }
    );
  }
}
