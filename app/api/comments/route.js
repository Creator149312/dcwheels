import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Comment from "@models/comment";
import User from "@models/user";
import mongoose from "mongoose";

// ✅ Create a new comment or reply
export async function POST(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entityType, entityId, text, parentCommentId } = await req.json();
    if (!entityType || !entityId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await Comment.create({
      userId: user._id,
      entityType,
      entityId,
      text,
      parentCommentId: parentCommentId || null,
    });

    const populated = await comment.populate("userId", "name avatar");

    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    console.error("Error creating comment:", err);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

// ✅ Get comments (supports threaded replies via parentCommentId filter)
// export async function GET(req) {
//   try {
//     await connectMongoDB();
//     const { searchParams } = new URL(req.url);
//     const entityType = searchParams.get("entityType");
//     const entityId = searchParams.get("entityId");
//     const parentCommentId = searchParams.get("parentCommentId"); // can be null or a comment ID

//     if (!entityType || !entityId) {
//       return NextResponse.json(
//         { error: "Missing entityType or entityId" },
//         { status: 400 }
//       );
//     }

//     const limit = parseInt(searchParams.get("limit") || "4");
//     const skip = parseInt(searchParams.get("skip") || "0");

//     const query = { entityType, entityId };
//     if (parentCommentId === "null") {
//       query.parentCommentId = null; // top-level comments
//     } else if (parentCommentId) {
//       query.parentCommentId = parentCommentId; // replies for a specific comment
//     }

//     const comments = await Comment.find(query)
//       .populate("userId", "name avatar")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     return NextResponse.json(comments, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching comments:", err);
//     return NextResponse.json(
//       { error: "Failed to fetch comments" },
//       { status: 500 }
//     );
//   }
// }

// ✅ Get comments (supports threaded replies via parentCommentId filter)
export async function GET(req) {
  try {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const parentCommentId = searchParams.get("parentCommentId");
    const limit = parseInt(searchParams.get("limit") || "4");
    const skip = parseInt(searchParams.get("skip") || "0");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing entityType or entityId" },
        { status: 400 }
      );
    }

    // Replies for a specific parent: plain find (no count needed)
    if (parentCommentId && parentCommentId !== "null") {
      const replies = await Comment.find({
        entityType,
        entityId,
        parentCommentId,
      })
        .populate("userId", "name avatar")
        .sort({ createdAt: 1 }); // oldest first feels natural

      return NextResponse.json(replies, { status: 200 });
    }

    // Top-level comments with replyCount (YouTube-style)
    if (parentCommentId === "null") {
      const aggregation = await Comment.aggregate([
        {
          $match: {
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId),
            parentCommentId: null,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "parentCommentId",
            as: "replies",
            pipeline: [{ $count: "count" }],
          },
        },
        {
          $addFields: {
            replyCount: {
              $ifNull: [{ $arrayElemAt: ["$replies.count", 0] }, 0],
            },
          },
        },
        { $project: { replies: 0 } },
      ]);

      // populate user fields after aggregation
      const ids = aggregation.map((c) => c._id);
      const docs = await Comment.find({ _id: { $in: ids } }).populate(
        "userId",
        "name avatar"
      );
      const byId = new Map(docs.map((d) => [String(d._id), d]));
      const merged = aggregation.map((c) => {
        const doc = byId.get(String(c._id));
        return {
          ...doc.toObject(),
          replyCount: c.replyCount || 0,
        };
      });

      return NextResponse.json(merged, { status: 200 });
    }

    // Default: if no parentCommentId provided, behave like top-level
    const comments = await Comment.find({
      entityType,
      entityId,
      parentCommentId: null,
    })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fallback without count
    return NextResponse.json(comments, { status: 200 });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
