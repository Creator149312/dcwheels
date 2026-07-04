import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import mongoose from "mongoose";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

/**
 * GET /api/admin/post-generator/topics
 *
 * Returns TopicPages that have 0 bot-generated posts linked to them.
 * Calculates a recommended post count (3-6) based on popularity signals.
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectMongoDB();
    const db = mongoose.connection.db;

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type"); // optional filter
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 50;
    const skip = (page - 1) * limit;

    const matchStage = { cover: { $exists: true, $ne: null } };
    if (typeFilter && ["anime", "movie", "game", "character"].includes(typeFilter)) {
      matchStage.type = typeFilter;
    }
    if (search) {
      const regex = { $regex: search, $options: "i" };
      matchStage.$or = [
        { "title.english": regex },
        { "title.romaji": regex },
        { "title.default": regex },
        { "title.original": regex },
        { slug: regex },
      ];
    }

    // Aggregate: find TopicPages that have no post with a matching contentRef
    const lookupAndFilter = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      // Lookup posts that reference this TopicPage
      {
        $lookup: {
          from: "posts",
          let: { topicType: "$type", topicId: { $toString: "$relatedId" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$contentRef.type", "$$topicType"] },
                    { $eq: ["$contentRef.externalId", "$$topicId"] },
                  ],
                },
              },
            },
            { $count: "total" },
          ],
          as: "postStats",
        },
      },
      // Only keep pages with 0 linked posts
      {
        $match: {
          $or: [{ postStats: { $size: 0 } }, { "postStats.0.total": { $lte: 0 } }],
        },
      },
    ];

    const [facetResult] = await db.collection("topicpages").aggregate([
      ...lookupAndFilter,
      {
        $facet: {
          total: [{ $count: "count" }],
          topics: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1, type: 1, relatedId: 1, slug: 1,
                title: 1, cover: 1, description: 1, tags: 1,
                wheels: 1, worthIt: 1, createdAt: 1,
              },
            },
          ],
        },
      },
    ]).toArray();

    const topics = facetResult?.topics || [];
    const total = facetResult?.total?.[0]?.count || 0;

    // Calculate recommended post count per topic based on popularity
    const result = topics.map((t) => {
      const yesVotes = t.worthIt?.yes || 0;
      const wheelCount = t.wheels || 0;
      const popularity = yesVotes + wheelCount * 2;

      let recommendedCount = 3;
      if (popularity >= 100) recommendedCount = 6;
      else if (popularity >= 40) recommendedCount = 5;
      else if (popularity >= 15) recommendedCount = 4;

      const displayTitle =
        t.title?.english ||
        t.title?.romaji ||
        t.title?.default ||
        t.title?.original ||
        "Unknown";

      return {
        id: String(t._id),
        type: t.type,
        relatedId: String(t.relatedId),
        slug: t.slug,
        displayTitle,
        cover: t.cover,
        description: t.description,
        tags: t.tags || [],
        recommendedCount,
        popularityScore: popularity,
        createdAt: t.createdAt,
      };
    });

    return NextResponse.json({ topics: result, page, limit, total, hasMore: skip + topics.length < total });
  } catch (err) {
    console.error("GET /api/admin/post-generator/topics error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
