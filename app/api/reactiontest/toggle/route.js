import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import ReactionTest from "@models/reactiontest";
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

    const existing = await ReactionTest.findOne({
      userId: user._id,
      entityType,
      entityId,
    });

    let likeCountDelta = 0;

    if (existing) {
      if (existing.reactionType === reactionType) {
        // Same reaction → remove it
        await ReactionTest.deleteOne({ _id: existing._id });
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
      await ReactionTest.create({
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

    const allReactions = await ReactionTest.find({ entityType, entityId });
    const count = allReactions.filter(r => r.reactionType === reactionType).length;

    const reactedByCurrentUser = await ReactionTest.exists({
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
