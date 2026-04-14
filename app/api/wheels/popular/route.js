import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";

// Cache popular list for 5 minutes at the CDN edge
export const revalidate = 300;

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
        sortQuery = { view_count: -1, createdAt: -1 };
        break;
      case "likes":
        sortQuery = { likeCount: -1, createdAt: -1 };
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
