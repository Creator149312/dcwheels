import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Comment from "@models/comment";
import User from "@models/user";

// ✅ Create a new comment
export async function POST(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { entityType, entityId, text, parentCommentId } = await req.json();
    if (!entityType || !entityId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const comment = await Comment.create({
      userId: user._id,
      entityType,
      entityId,
      text,
      parentCommentId: parentCommentId || null,
    });

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

// ✅ Get all comments for an entity
export async function GET(req) {
  try {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing entityType or entityId" },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get("limit") || "4");
    const skip = parseInt(searchParams.get("skip") || "0");

    const comments = await Comment.find({ entityType, entityId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(comments, { status: 200 });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
