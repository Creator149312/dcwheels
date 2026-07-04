import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Reaction from "@models/reaction";
import Wheel from "@models/wheel";
import User from "@models/user";
import Post from "@models/post";
import Comment from "@models/comment";
import { createNotification } from "@/lib/notificationService";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";

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

    let user = null;
    if (session.user?.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
      user = await User.findById(session.user.id).select("_id").lean();
    }
    if (!user && session.user?.email) {
      user = await User.findOne({ email: session.user.email }).select("_id").lean();
    }
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Reaction.findOne({
      userId: user._id,
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
        userId: user._id,
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

          if (entityType === "post") {
            const post = await Post.findById(entityObjectId).select("userId").lean();
            if (post?.userId) {
              recipientId = post.userId;
              link = `/post/${entityId}`;
              modelStr = "Post";
            }
          } else if (entityType === "wheel") {
            const wheel = await Wheel.findById(entityObjectId).select("createdBy urlEndpoint").lean();
            if (wheel?.createdBy) {
              const wheelCreator = await User.findOne({ email: wheel.createdBy }).select("_id").lean();
              if (wheelCreator?._id) {
                recipientId = wheelCreator._id;
                link = wheel.urlEndpoint ? `/${wheel.urlEndpoint}` : `/uwheels/${entityId}`;
                modelStr = "Wheel";
              }
            }
          }

          if (recipientId && String(recipientId) !== String(user._id)) {
            await createNotification({
              recipientId,
              senderId: user._id,
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

    // Update denormalized likeCount on Wheel or Post
    if (entityType === "wheel" && likeCountDelta !== 0) {
      await Wheel.updateOne(
        { _id: entityObjectId },
        { $inc: { likeCount: likeCountDelta } }
      );
    } else if (entityType === "post" && likeCountDelta !== 0) {
      await Post.updateOne(
        { _id: entityObjectId },
        { $inc: { likeCount: likeCountDelta } }
      );
    }

    // Count only the reactions matching the toggled type, using an indexed
    // count query instead of pulling every reaction doc into memory.
    const count = await Reaction.countDocuments({
      entityType,
      entityId: entityObjectId,
      reactionType,
    });

    const reactedByCurrentUser = await Reaction.exists({
      userId: user._id,
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
