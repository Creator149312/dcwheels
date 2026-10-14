import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import PostVote from "@models/postVote";
import { sessionUser } from "@utils/SessionData";
import { cookies } from "next/headers";
import { checkRateLimit, getIpFromRequest } from "@lib/rateLimit";
import { GUEST_COOKIE_NAME } from "@/middleware";
import { computeHotScore, sumPollVotes } from "@lib/hotScore";

/**
 * POST /api/post/[id]/vote
 * Vote on a post's poll option (supports both logged-in users and frictionless guest sessions)
 */
export async function POST(req, { params }) {
  try {
    const { id } = params;

    // Rate limit per IP to guard against malicious automated vote flood
    const ip = getIpFromRequest(req);
    const rateCheck = await checkRateLimit(ip, `/api/post/${id}/vote`);
    if (rateCheck.limited) {
      return NextResponse.json(
        { message: `Too many votes. Please wait ${rateCheck.retryAfter}s.` },
        { status: 429 }
      );
    }

    const sessionData = await sessionUser("_id").catch(() => null);
    const userId = sessionData?.userId || null;

    // If not logged in, retrieve the guestId from cookies or header
    let guestId = null;
    if (!userId) {
      const cookieStore = cookies();
      guestId =
        cookieStore.get(GUEST_COOKIE_NAME)?.value ||
        req.headers.get("x-guest-id") ||
        null;

      if (!guestId) {
        return NextResponse.json(
          { message: "Unable to establish identity session" },
          { status: 400 }
        );
      }
    }

    const body = await req.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json({ message: "Option ID is required" }, { status: 400 });
    }

    await connectMongoDB();

    // Get post
    const post = await Post.findById(id).select("hasPoll pollOptions").lean();
    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (!post.hasPoll || !post.pollOptions?.length) {
      return NextResponse.json({ message: "This post doesn't have a poll" }, { status: 400 });
    }

    // Record the vote first; the dual sparse unique index prevents
    // duplicate votes even under concurrency:
    // { postId: 1, userId: 1 } (sparse) & { postId: 1, guestId: 1 } (sparse)
    try {
      await PostVote.create({
        postId: id,
        userId: userId || null,
        guestId: userId ? null : guestId,
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
      { new: true, select: "createdAt likeCount commentCount pollOptions", lean: true }
    );

    if (!updated) {
      // Roll back the vote record if the option didn't exist.
      if (userId) {
        await PostVote.deleteOne({ postId: id, userId });
      } else {
        await PostVote.deleteOne({ postId: id, guestId });
      }
      return NextResponse.json({ message: "Option not found" }, { status: 404 });
    }

    // Recompute and persist hotScore after vote increment
    const newHotScore = computeHotScore({
      createdAt: updated.createdAt,
      votes: sumPollVotes(updated.pollOptions),
      likes: updated.likeCount || 0,
      comments: updated.commentCount || 0,
    });
    Post.updateOne({ _id: id }, { $set: { hotScore: newHotScore } }).catch(() => {});

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
