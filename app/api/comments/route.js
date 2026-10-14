import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Comment from "@models/comment";
import User from "@models/user";
import Post from "@models/post";
import Wheel from "@models/wheel";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@/utils/SessionData";
import mongoose from "mongoose";
import { createNotification, enqueueNotification } from "@/lib/notificationService";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";
import { syncListIndexedState } from "@/lib/listIndexGate";
import { validateContentSafety } from "@lib/contentSafety";
import { refreshEntityHotScore } from "@lib/hotScore";

// ✅ Create a new comment or reply
export async function POST(req) {
  try {
    await connectMongoDB();

    const ip = getIpFromRequest(req);
    const { limited, retryAfter } = await checkRateLimit(ip, "/api/comments");
    if (limited) {
      return rateLimitResponse(retryAfter);
    }

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

    // Tier 1 Content Safety Gate (Write-Time Hard Reject)
    const safetyCheck = validateContentSafety([text]);
    if (!safetyCheck.isSafe) {
      return NextResponse.json({ error: safetyCheck.error }, { status: 400 });
    }

    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await Comment.create({
      userId,
      entityType,
      entityId,
      text,
      parentCommentId: parentCommentId || null,
    });

    // Update denormalized commentCount on the parent entity
    try {
      if (entityType === "post") {
        await Post.updateOne({ _id: entityId }, { $inc: { commentCount: 1 } });
        refreshEntityHotScore(Post, entityId).catch(() => {});
      } else if (entityType === "wheel" || entityType === "uwheel") {
        await Wheel.updateOne({ _id: entityId }, { $inc: { commentCount: 1 } });
        refreshEntityHotScore(Wheel, entityId).catch(() => {});
      } else if (entityType === "list") {
        await UnifiedList.updateOne({ _id: entityId }, { $inc: { commentCount: 1 } });
        syncListIndexedState(entityId).catch(() => {});
        refreshEntityHotScore(UnifiedList, entityId).catch(() => {});
      }
    } catch (countErr) {
      console.error("Error updating comment count:", countErr);
    }

    try {
      let recipientId = null;
      let link = "";
      let modelStr = "";

      if (parentCommentId) {
        // It's a REPLY to a comment
        const parentComment = await Comment.findById(parentCommentId).select("userId").lean();
        if (parentComment?.userId) {
          recipientId = parentComment.userId;
          link = (entityType === "wheel" || entityType === "uwheel")
            ? `/wheels/${entityId}` // fallback, could fetch wheel for exact link
            : `/posts/${entityId}`;
          modelStr = "Comment";
        }
      } else {
        // It's a COMMENT on a Post or Wheel
        if (entityType === "post") {
          const post = await Post.findById(entityId).select("userId").lean();
          if (post?.userId) {
            recipientId = post.userId;
            link = `/posts/${entityId}`;
            modelStr = "Post";
          }
        } else if (entityType === "wheel" || entityType === "uwheel") {
          const wheel = await Wheel.findById(entityId).select("userId urlEndpoint").lean();
          if (wheel?.userId) {
            recipientId = wheel.userId;
            link = wheel.urlEndpoint ? `/${wheel.urlEndpoint}` : `/wheels/${entityId}`;
            modelStr = "Wheel";
          }
        }
      }

      if (recipientId && String(recipientId) !== String(userId)) {
        enqueueNotification({
          recipientId,
          senderId: userId,
          type: parentCommentId ? "REPLY" : "COMMENT",
          entityId: comment._id,
          entityModel: modelStr,
          message: `${session.user.name || "Someone"} ${parentCommentId ? "replied to your comment" : `commented on your ${modelStr.toLowerCase()}`}`,
          link
        });
      }
    } catch (notifErr) {
      console.error("Error creating comment notification:", notifErr);
    }

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
export async function GET(req) {
  try {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const parentCommentId = searchParams.get("parentCommentId");
    const limit = parseInt(searchParams.get("limit") || "15");
    const skip = parseInt(searchParams.get("skip") || "0");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing entityType or entityId" },
        { status: 400 }
      );
    }

    // Replies for a specific parent: plain find
    if (parentCommentId && parentCommentId !== "null") {
      const replies = await Comment.find({
        entityType,
        entityId,
        parentCommentId,
      })
        .populate("userId", "name avatar image")
        .sort({ createdAt: 1 });

      return NextResponse.json(replies, { status: 200 });
    }

    // Top-level comments with replyCount + populated user, in a SINGLE
    // aggregation. The previous implementation ran the aggregation, then
    // re-fetched the same docs through Mongoose just to populate `userId`.
    // We now $lookup users + reply counts inline. Output shape is preserved
    // exactly: each item is a plain object with the original Comment fields,
    // `userId` is the populated subset { _id, name, avatar }, and
    // `replyCount` is appended.
    if (parentCommentId === "null" || !parentCommentId) {
      const merged = await Comment.aggregate([
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
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { name: 1, avatar: 1, image: 1 } }],
          },
        },
        {
          $addFields: {
            replyCount: {
              $ifNull: [{ $arrayElemAt: ["$replies.count", 0] }, 0],
            },
            userId: { $arrayElemAt: ["$user", 0] },
          },
        },
        { $project: { replies: 0, user: 0 } },
      ]);

      return NextResponse.json(merged, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid parentCommentId" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error fetching comments:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
