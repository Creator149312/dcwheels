// app/api/follow/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // adjust path if needed
import { connectMongoDB } from "@/lib/mongodb";
import Follow from "@/models/follow";
import User from "@/models/user";
import mongoose from "mongoose";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";

const SUPPORTED_ENTITY_TYPES = ["group", "user", "topicpage", "tag"];

function normaliseTag(tag) {
  return typeof tag === "string"
    ? tag.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "")
    : "";
}

function normaliseEntity(entityType, entityId) {
  const type = String(entityType || "").toLowerCase().trim();
  if (!SUPPORTED_ENTITY_TYPES.includes(type)) return null;

  if (type === "tag") {
    const tag = normaliseTag(entityId);
    if (!tag) return null;
    return { entityType: type, entityId: tag };
  }

  const raw = String(entityId || "").trim();
  if (!raw) return null;
  const id = mongoose.Types.ObjectId.isValid(raw)
    ? new mongoose.Types.ObjectId(raw)
    : raw;

  return { entityType: type, entityId: id };
}

export async function GET(req) {
  const ip = getIpFromRequest(req);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/follow:get");
  if (limited) return rateLimitResponse(retryAfter);

  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    const normalised = normaliseEntity(entityType, entityId);
    if (!normalised) {
      return NextResponse.json({ error: "Invalid entityType or entityId" }, { status: 400 });
    }

    const followerCount = await Follow.countDocuments(normalised);

    if (!session?.user?.email) {
      return NextResponse.json({ isFollowing: false, followerCount }, { status: 200 });
    }

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ isFollowing: false, followerCount }, { status: 200 });
    }

    const existingFollow = await Follow.findOne({
      userId: user._id,
      entityId: normalised.entityId,
      entityType: normalised.entityType,
    }).lean();

    return NextResponse.json(
      { isFollowing: !!existingFollow, followerCount },
      { status: 200 }
    );
  } catch (err) {
    console.error("Follow API GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const ip = getIpFromRequest(req);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/follow");
  if (limited) return rateLimitResponse(retryAfter);

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
    const normalised = normaliseEntity(entityType, entityId);
    if (!normalised) {
      return NextResponse.json(
        { error: "Invalid entityId or entityType" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Preserve the old tag-follow cap from /api/user/follow-tag.
    if (normalised.entityType === "tag") {
      const tagFollowCount = await Follow.countDocuments({ userId: user._id, entityType: "tag" });
      const alreadyFollowingTag = await Follow.exists({
        userId: user._id,
        entityId: normalised.entityId,
        entityType: "tag",
      });
      if (!alreadyFollowingTag && tagFollowCount >= 100) {
        return NextResponse.json({ error: "Follow limit reached (100 tags)" }, { status: 422 });
      }
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      userId: user._id,
      entityId: normalised.entityId,
      entityType: normalised.entityType,
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
        entityId: normalised.entityId,
        entityType: normalised.entityType,
      });
      isFollowing = true;
    }

    // Get updated follower count
    const followerCount = await Follow.countDocuments({
      entityId: normalised.entityId,
      entityType: normalised.entityType,
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
