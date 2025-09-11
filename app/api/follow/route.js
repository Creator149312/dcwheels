// app/api/follow/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // adjust path if needed
import { connectMongoDB } from "@/lib/mongodb";
import Follow from "@/models/follow";
import User from "@/models/user";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to follow" },
        { status: 401 }
      );
    }

    const { entityId, entityType } = await req.json();
    if (!entityId || !entityType) {
      return NextResponse.json(
        { error: "Missing entityId or entityType" },
        { status: 400 }
      );
    }

    // Validate ObjectId
    const id = mongoose.Types.ObjectId.isValid(entityId)
      ? new mongoose.Types.ObjectId(entityId)
      : entityId;

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      userId: user._id,
      entityId: id,
      entityType,
    });

    let isFollowing;
    if (existingFollow) {
      // Unfollow
      await existingFollow.deleteOne();
      isFollowing = false;
    } else {
      // Follow
      await Follow.create({
        userId: user._id,
        entityId: id,
        entityType,
      });
      isFollowing = true;
    }

    // Get updated follower count
    const followerCount = await Follow.countDocuments({
      entityId: id,
      entityType,
    });

    return NextResponse.json({ isFollowing, followerCount }, { status: 200 });
  } catch (err) {
    console.error("Follow API error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
