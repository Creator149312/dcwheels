import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import ReactionTest from "@models/reactiontest";
import User from "@models/user";

export async function PATCH(req) {
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

    if (existing) {
      if (existing.reactionType === reactionType) {
        // Same reaction → remove it
        await ReactionTest.deleteOne({ _id: existing._id });
      } else {
        // Switch reaction type
        existing.reactionType = reactionType;
        await existing.save();
      }
    } else {
      await ReactionTest.create({
        userId: user._id,
        entityType,
        entityId,
        reactionType,
      });
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
