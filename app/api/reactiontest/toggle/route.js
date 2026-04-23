import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Reaction from "@models/reaction";
import Wheel from "@models/wheel";
import User from "@models/user";
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

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Reaction.findOne({
      userId: user._id,
      entityType,
      entityId,
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
        entityId,
        reactionType,
      });
      if (reactionType === "like") likeCountDelta = 1;
    }

    // Update denormalized likeCount on Wheel
    if (entityType === "wheel" && likeCountDelta !== 0) {
      await Wheel.updateOne({ _id: entityId }, { $inc: { likeCount: likeCountDelta } });
    }

    // Count only the reactions matching the toggled type, using an indexed
    // count query instead of pulling every reaction doc into memory.
    const count = await Reaction.countDocuments({
      entityType,
      entityId,
      reactionType,
    });

    const reactedByCurrentUser = await Reaction.exists({
      userId: user._id,
      entityType,
      entityId,
      reactionType,
    });

    return NextResponse.json({
      count,
      reactedByCurrentUser: !!reactedByCurrentUser,
    });
  } catch (err) {
    console.error("Error toggling reaction:", err);
    return NextResponse.json({ error: "Failed to toggle reaction" }, { status: 500 });
  }
}
