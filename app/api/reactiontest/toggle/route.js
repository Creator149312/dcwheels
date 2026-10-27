import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Reaction from "@models/reaction";
import Wheel from "@models/wheel";
import User from "@models/user";
import Post from "@models/post";
import UnifiedList from "@models/unifiedlist";
import Comment from "@models/comment";
import { sessionUserId } from "@/utils/SessionData";
import { createNotification, enqueueNotification } from "@/lib/notificationService";
import { enqueueMilestoneCheck } from "@/lib/milestoneEmailService";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";
import { syncListIndexedState } from "@/lib/listIndexGate";
import { refreshEntityHotScore } from "@lib/hotScore";

export async function PATCH(req) {
  const ip = getIpFromRequest(req);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/reactiontest/toggle");
  if (limited) return rateLimitResponse(retryAfter);

  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entityType, entityId, reactionType } = await req.json();

    if (!entityType || !entityId || !reactionType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return NextResponse.json({ error: "Invalid entityId" }, { status: 400 });
    }

    const entityObjectId = new mongoose.Types.ObjectId(entityId);

    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Reaction.findOne({
      userId: userId,
      entityType,
      entityId: entityObjectId,
    });

    let likeCountDelta = 0;

    if (existing) {
      if (existing.reactionType === reactionType) {
        // Same reaction → remove it
        await Reaction.deleteOne({ _id: existing._id });
        if (reactionType === "like") likeCountDelta = -1;
      } else {
        // Switch reaction type
        const wasLike = existing.reactionType === "like";
        const isLike = reactionType === "like";
        existing.reactionType = reactionType;
        await existing.save();
        if (wasLike && !isLike) likeCountDelta = -1;
        if (!wasLike && isLike) likeCountDelta = 1;
      }
    } else {
      await Reaction.create({
        userId: userId,
        entityType,
        entityId: entityObjectId,
        reactionType,
      });
      if (reactionType === "like") likeCountDelta = 1;

      // --- NOTIFICATION TRIGGER ---
      if (reactionType === "like") {
        try {
          let recipientId = null;
          let link = "";
          let modelStr = "";
          let entityTitle = "";

          if (entityType === "post") {
            const post = await Post.findById(entityObjectId).select("userId content title").lean();
            if (post?.userId) {
              recipientId = post.userId;
              link = `/posts/${entityId}`;
              modelStr = "Post";
              entityTitle = post.title || post.content?.slice(0, 60) || "Post";
            }
          } else if (entityType === "wheel") {
            const wheel = await Wheel.findById(entityObjectId).select("userId urlEndpoint title").lean();
            if (wheel?.userId) {
              recipientId = wheel.userId;
              link = wheel.urlEndpoint ? `/${wheel.urlEndpoint}` : `/wheels/${entityId}`;
              modelStr = "Wheel";
              entityTitle = wheel.title || "Wheel";
            }
          } else if (entityType === "list") {
            const listDoc = await UnifiedList.findById(entityObjectId).select("userId slug name").lean();
            if (listDoc?.userId) {
              recipientId = listDoc.userId;
              link = listDoc.slug ? `/lists/${listDoc.slug}` : `/lists/${entityId}`;
              modelStr = "List";
              entityTitle = listDoc.name || "List";
            }
          }

          if (recipientId && String(recipientId) !== String(userId)) {
            enqueueNotification({
              recipientId,
              senderId: userId,
              type: "LIKE",
              entityId: entityObjectId,
              entityModel: modelStr,
              message: `${session.user.name || "Someone"} liked your ${modelStr.toLowerCase()}`,
              link
            });
          }
        } catch (notifErr) {
          console.error("Error creating like notification:", notifErr);
        }
      }
      // -----------------------------
    }

    // Update denormalized likeCount on the parent entity
    if (entityType === "wheel" && likeCountDelta !== 0) {
      const updated = await Wheel.findByIdAndUpdate(
        entityObjectId,
        { $inc: { likeCount: likeCountDelta } },
        { new: true, select: "userId likeCount title urlEndpoint" }
      ).lean();
      refreshEntityHotScore(Wheel, entityObjectId).catch(() => {});

      if (likeCountDelta > 0 && updated?.userId && updated.likeCount) {
        enqueueMilestoneCheck({
          userId: updated.userId,
          entityId: entityObjectId,
          entityType: "wheel",
          milestoneType: "LIKE",
          currentCount: updated.likeCount,
          entityTitle: updated.title || "Wheel",
          entityUrl: updated.urlEndpoint ? `/${updated.urlEndpoint}` : `/wheels/${entityId}`,
        });
      }
    } else if (entityType === "post" && likeCountDelta !== 0) {
      const updated = await Post.findByIdAndUpdate(
        entityObjectId,
        { $inc: { likeCount: likeCountDelta } },
        { new: true, select: "userId likeCount title content" }
      ).lean();
      refreshEntityHotScore(Post, entityObjectId).catch(() => {});

      if (likeCountDelta > 0 && updated?.userId && updated.likeCount) {
        enqueueMilestoneCheck({
          userId: updated.userId,
          entityId: entityObjectId,
          entityType: "post",
          milestoneType: "LIKE",
          currentCount: updated.likeCount,
          entityTitle: updated.title || updated.content?.slice(0, 60) || "Post",
          entityUrl: `/posts/${entityId}`,
        });
      }
    } else if (entityType === "list" && likeCountDelta !== 0) {
      const updated = await UnifiedList.findByIdAndUpdate(
        entityObjectId,
        { $inc: { likeCount: likeCountDelta } },
        { new: true, select: "userId likeCount name slug" }
      ).lean();
      syncListIndexedState(entityObjectId).catch(() => {});
      refreshEntityHotScore(UnifiedList, entityObjectId).catch(() => {});

      if (likeCountDelta > 0 && updated?.userId && updated.likeCount) {
        enqueueMilestoneCheck({
          userId: updated.userId,
          entityId: entityObjectId,
          entityType: "list",
          milestoneType: "LIKE",
          currentCount: updated.likeCount,
          entityTitle: updated.name || "List",
          entityUrl: updated.slug ? `/lists/${updated.slug}` : `/lists/${entityId}`,
        });
      }
    }

    // Count only the reactions matching the toggled type, using an indexed
    // count query instead of pulling every reaction doc into memory.
    const count = await Reaction.countDocuments({
      entityType,
      entityId: entityObjectId,
      reactionType,
    });

    const reactedByCurrentUser = await Reaction.exists({
      userId: userId,
      entityType,
      entityId: entityObjectId,
      reactionType,
    });

    return NextResponse.json({
      count,
      reactedByCurrentUser: !!reactedByCurrentUser,
    });
  } catch (err) {
    console.error("Error toggling reaction:", err.message);
    console.error("Stack:", err.stack);
    return NextResponse.json({ error: "Failed to toggle reaction", details: err.message }, { status: 500 });
  }
}
