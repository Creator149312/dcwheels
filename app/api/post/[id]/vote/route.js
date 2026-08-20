import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import PostVote from "@models/postVote";
import { sessionUser } from "@utils/SessionData";

/**
 * POST /api/post/[id]/vote
 * Vote on a post's poll option
 */
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const sessionData = await sessionUser("_id");

    if (!sessionData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId } = sessionData;
    if (!userId) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json({ message: "Option ID is required" }, { status: 400 });
    }

    await connectMongoDB();

    // Get post
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (!post.hasPoll || !post.pollOptions?.length) {
      return NextResponse.json({ message: "This post doesn't have a poll" }, { status: 400 });
    }

    // Record the vote first; the unique index on { postId, userId } prevents
    // duplicate votes even under concurrency.
    try {
      await PostVote.create({
        postId: id,
        userId: userId,
        optionId,
      });
    } catch (err) {
      if (err?.code === 11000) {
        return NextResponse.json({ message: "You already voted on this poll" }, { status: 409 });
      }
      throw err;
    }

    // Atomically increment option voteCount and return updated pollOptions in a single round-trip.
    const updated = await Post.findOneAndUpdate(
      { _id: id, "pollOptions._id": optionId },
      { $inc: { "pollOptions.$.voteCount": 1 } },
      { new: true, select: "pollOptions", lean: true }
    );

    if (!updated) {
      // Roll back the vote record if the option didn't exist.
      await PostVote.deleteOne({ postId: id, userId });
      return NextResponse.json({ message: "Option not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Vote recorded",
      options: updated.pollOptions.map((opt) => ({
        id: String(opt._id),
        text: opt.text,
        image: opt.image || null,
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
