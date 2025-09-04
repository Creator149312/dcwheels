import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Review from "@models/review";
import ReactionTest from "@models/reactiontest"; // NEW: import your unified Reaction model
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import User from "@models/user";

// ✅ Create a new review
export async function POST(req) {
  await connectMongoDB();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, contentId, recommend, text, rating } = body;

  if (!type || !contentId || recommend === undefined || !text) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const review = await Review.create({
    type,
    contentId,
    recommend,
    text,
    rating,
    user: user._id, // from session
  });

  const populated = await review.populate("user", "name avatar");
  return NextResponse.json(populated, { status: 201 });

  // return NextResponse.json(review, { status: 201 });
}

// ✅ Get reviews for a specific content with like info
export async function GET(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const contentId = searchParams.get("contentId");

    if (!type || !contentId) {
      return NextResponse.json(
        { error: "Missing type or contentId" },
        { status: 400 }
      );
    }

    const currentUser = session
      ? await User.findOne({ email: session.user.email })
      : null;

    // Fetch all reviews for the content
    const reviews = await Review.find({ type, contentId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .lean();


    // Attach likes info from Reaction model
    const enhanced = await Promise.all(
      reviews.map(async (r) => {
        const likesCount = await ReactionTest.countDocuments({
          entityType: "review",
          entityId: r._id,
          reactionType: "like",
        });

        const likedByCurrentUser = currentUser
          ? await ReactionTest.exists({
              entityType: "review",
              entityId: r._id,
              reactionType: "like",
              userId: currentUser._id,
            })
          : false;

        return {
          ...r,
          likesCount,
          likedByCurrentUser: !!likedByCurrentUser,
        };
      })
    );

    return NextResponse.json(enhanced, { status: 200 });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
