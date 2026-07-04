import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Comment from "@models/comment";
import User from "@models/user";
import Post from "@models/post";
import Wheel from "@models/wheel";
import mongoose from "mongoose";
import { createNotification } from "@/lib/notificationService";
import { shadowBanUser } from "@lib/shadowBan";

const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/i;

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

    // Link-drop guard: silently shadow-ban and still "succeed" so spambots
    // don't know they've been caught
    if (URL_PATTERN.test(text)) {
      await shadowBanUser(user._id);
    }

    const comment = await Comment.create({
      userId: user._id,
      entityType,
      entityId,
      text,
      parentCommentId: parentCommentId || null,
    });

    // Update denormalized commentCount on Post or Wheel
    try {
      if (entityType === "post") {
        await Post.updateOne({ _id: entityId }, { $inc: { commentCount: 1 } });
      } else if (entityType === "wheel") {
        await Wheel.updateOne({ _id: entityId }, { $inc: { commentCount: 1 } });
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
          link = entityType === "wheel" 
            ? `/uwheels/${entityId}` // fallback, could fetch wheel for exact link
            : `/post/${entityId}`;
          modelStr = "Comment";
        }
      } else {
        // It's a COMMENT on a Post or Wheel
        if (entityType === "post") {
          const post = await Post.findById(entityId).select("userId").lean();
          if (post?.userId) {
            recipientId = post.userId;
            link = `/post/${entityId}`;
            modelStr = "Post";
          }
        } else if (entityType === "wheel") {
          const wheel = await Wheel.findById(entityId).select("createdBy urlEndpoint").lean();
          if (wheel?.createdBy) {
            // createdBy usually holds the email -> find the User ObjectId
            const wheelCreator = await User.findOne({ email: wheel.createdBy }).select("_id").lean();
            if (wheelCreator?._id) {
              recipientId = wheelCreator._id;
              // Link fallback
              link = wheel.urlEndpoint ? `/${wheel.urlEndpoint}` : `/uwheels/${entityId}`;
              modelStr = "Wheel";
            }
          }
        }
      }

      if (recipientId && String(recipientId) !== String(user._id)) {
        await createNotification({
          recipientId,
          senderId: user._id,
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

    // Top-level comments with replyCount + populated user, in a SINGLE
    // aggregation. The previous implementation ran the aggregation, then
    // re-fetched the same docs through Mongoose just to populate `userId`.
    // We now $lookup users + reply counts inline. Output shape is preserved
    // exactly: each item is a plain object with the original Comment fields,
    // `userId` is the populated subset { _id, name, avatar }, and
    // `replyCount` is appended.
    if (parentCommentId === "null") {
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
            pipeline: [{ $project: { name: 1, avatar: 1 } }],
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
