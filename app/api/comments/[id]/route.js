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
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";
import { syncListIndexedState } from "@/lib/listIndexGate";
import { refreshEntityHotScore } from "@lib/hotScore";

// ✅ Edit a comment
export async function PATCH(req, { params }) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the author can edit
    if (comment.userId.toString() !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    comment.text = text;
    await comment.save();
    const populated = await comment.populate("userId", "name avatar");

    return NextResponse.json(populated, { status: 200 });
  } catch (err) {
    console.error("Error updating comment:", err);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// ✅ Delete a comment (and optionally its replies)
export async function DELETE(req, { params }) {
  try {
    await connectMongoDB();

    const ip = getIpFromRequest(req);
    const { limited, retryAfter } = await checkRateLimit(ip, `/api/comments/${params.id}`);
    if (limited) {
      return rateLimitResponse(retryAfter);
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only author can delete
    if (comment.userId.toString() !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Optional: delete all replies to this comment
    const repliesCount = await Comment.countDocuments({ parentCommentId: comment._id });
    await Comment.deleteMany({ parentCommentId: comment._id });

    await comment.deleteOne();

    // Decrement denormalized count on the parent entity (never below 0)
    try {
      const totalToRemove = 1 + repliesCount;
      const decrementStage = [
        {
          $set: {
            commentCount: {
              $max: [{ $subtract: ["$commentCount", totalToRemove] }, 0],
            },
          },
        },
      ];
      if (comment.entityType === "post") {
        await Post.updateOne({ _id: comment.entityId }, decrementStage);
        refreshEntityHotScore(Post, comment.entityId).catch(() => {});
      } else if (comment.entityType === "wheel" || comment.entityType === "uwheel") {
        await Wheel.updateOne({ _id: comment.entityId }, decrementStage);
        refreshEntityHotScore(Wheel, comment.entityId).catch(() => {});
      } else if (comment.entityType === "list") {
        await UnifiedList.updateOne({ _id: comment.entityId }, decrementStage);
        syncListIndexedState(comment.entityId).catch(() => {});
        refreshEntityHotScore(UnifiedList, comment.entityId).catch(() => {});
      }
    } catch (countErr) {
      console.error("Error decrementing comment count:", countErr);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
