import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import PostVote from "@models/postVote";
import User from "@models/user";

/**
 * POST /api/post/[id]/vote
 * Vote on a post's poll option
 */
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json({ message: "Option ID is required" }, { status: 400 });
    }

    await connectMongoDB();

    // Get user
    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get post
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (!post.hasPoll || !post.pollOptions?.length) {
      return NextResponse.json({ message: "This post doesn't have a poll" }, { status: 400 });
    }

    // Check if user already voted
    const existing = await PostVote.findOne({ postId: id, userId: user._id });
    if (existing) {
      return NextResponse.json({ message: "You already voted on this poll" }, { status: 409 });
    }

    // Find the option and increment vote count
    const option = post.pollOptions.id(optionId);
    if (!option) {
      return NextResponse.json({ message: "Option not found" }, { status: 404 });
    }

    option.voteCount = (option.voteCount || 0) + 1;

    // Record the vote
    await PostVote.create({
      postId: id,
      userId: user._id,
      optionId,
    });

    // Save post with updated vote count
    await post.save();

    // Return updated options
    const updated = await Post.findById(id).select("pollOptions").lean();

    return NextResponse.json({
      message: "Vote recorded",
      options: updated.pollOptions.map((opt) => ({
        id: String(opt._id),
        text: opt.text,
        voteCount: opt.voteCount,
      })),
    });
  } catch (err) {
    console.error("POST /api/post/[id]/vote error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to record vote" },
      { status: 500 }
    );
  }
}
