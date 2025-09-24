import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { searchtitle } = params;
  const { searchParams } = new URL(request.url);
  const start = parseInt(searchParams.get("start") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  await connectMongoDB();

  try {
    const allMatches = await Wheel.find({
      title: { $regex: new RegExp(searchtitle, "i") },
    });

    const sliced = allMatches.slice(start, start + limit);

    return NextResponse.json(
      { list: sliced, total: allMatches.length },
      {
        status: 200,
        // Optional: caching hint (if supported by your framework)
        // headers: { "Cache-Control": "public, max-age=60" }
      }
    );
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wheels" },
      { status: 500 }
    );
  }
}
