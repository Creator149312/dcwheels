// /app/api/tags-data/route.js 
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@/models/wheel";
import Tag from "@/models/tag";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectMongoDB();

    // Primary: serve from Tag collection (canonical slugs, sorted by wheelCount).
    const tagDocs = await Tag.find({ isPublic: true })
      .sort({ wheelCount: -1 })
      .limit(100)
      .select("slug displayName wheelCount")
      .lean();

    if (tagDocs.length > 0) {
      const tags = tagDocs.map((t) => ({
        slug: t.slug,
        name: t.displayName,
        count: t.wheelCount,
      }));
      return NextResponse.json({ tags });
    }

    // Fallback: Tag collection not yet seeded — aggregate raw Wheel.tags.
    const tagsWithCounts = await Wheel.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 },
      { $project: { name: "$_id", count: 1, _id: 0 } },
    ]);

    const tags = tagsWithCounts.map((tag) => ({
      slug: tag.name,
      name: tag.name,
      count: tag.count,
    }));

    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
