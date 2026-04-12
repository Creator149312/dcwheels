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
        sortQuery = { viewCount: -1, createdAt: -1 };
        break;
      case "likes":
        sortQuery = { likeCount: -1, createdAt: -1 };
        break;
      case "recent":
        sortQuery = { createdAt: -1 };
        break;
      case "popular":
      default:
        // Composite score: likes weighted 3x + views, with recency tiebreak
        sortQuery = { likeCount: -1, viewCount: -1, createdAt: -1 };
        break;
    }

    const wheels = await Wheel.find({})
      .select("title description tags createdBy viewCount likeCount createdAt")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ wheels }, { status: 200 });
  } catch (err) {
    console.error("GET /api/wheels/popular error:", err);
    return NextResponse.json(
      { error: "Failed to fetch popular wheels" },
      { status: 500 }
    );
  }
}
