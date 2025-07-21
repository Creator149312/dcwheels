// /app/api/tags-data/route.js 
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@/models/wheel";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectMongoDB();

    // Aggregate tags by usage count
    const tagsWithCounts = await Wheel.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 }, //getting top 20 tags
      { $project: { name: "$_id", count: 1, _id: 0 } }
    ]);

    const tags = tagsWithCounts.map(tag => tag.name);

    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
