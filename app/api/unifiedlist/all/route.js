import { NextResponse } from "next/server";
import UnifiedList from "@models/unifiedlist";
import { connectMongoDB } from "@lib/mongodb";

export async function GET(req) {
  await connectMongoDB();

  try {
    const { searchParams } = new URL(req.url);

    // ✅ Pagination params
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    // ✅ Fetch ALL lists (public browsing)
    const lists = await UnifiedList.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ Format response for UI
    const formatted = lists.map((list) => ({
      id: list._id.toString(),
      name: list.name,
      description: list.description,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      userId: list.userId?.toString(),

      // ✅ Include items so we can compute cover images
      items: list.items.map((item) => ({
        type: item.type,
        word: item.word,
        wordData: item.wordData,
        entityType: item.entityType,
        entityId: item.entityId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        addedAt: item.addedAt,
      })),
    }));

    return NextResponse.json({ lists: formatted }, { status: 200 });
  } catch (err) {
    console.error("GET /api/unifiedlist error:", err);
    return NextResponse.json(
      { error: "Failed to fetch lists", details: err.message },
      { status: 500 }
    );
  }
}
