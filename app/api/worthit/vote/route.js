import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";
import TopicPageVote from "@models/topicPageVote";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { ratingToVote } from "@lib/worthItLogic";

// ---------------------------------------------------------------------------
// "Worth It?" vote endpoint
//
// POST /api/worthit/vote
//   Body: { topicPageId: string, vote: "yes" | "no" }
//   Returns: { yes: number, no: number }
//
//   User persistence:
//   If logged in, we store the vote in `TopicPageVote` to prevent duplicates
//   and allow cross-device sync. If anonymous, we fallback to simple $inc.
// ---------------------------------------------------------------------------

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await connectMongoDB();

  const page = await TopicPage.findById(id)
    .select("worthIt rating")
    .lean();

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If user is logged in, also check if they have voted
  const session = await getServerSession(authOptions);
  let userRating = null;
  const userId = session?.user?.id || session?.user?.mongoId;
  if (userId) {
    const existing = await TopicPageVote.findOne({
      topicPageId: id,
      userId: userId,
    }).lean();
    userRating = existing?.rating || null;
  }

  return NextResponse.json({
    worthIt: page.worthIt || { yes: 0, no: 0, meh: 0 },
    rating: page.rating || { totalScore: 0, count: 0 },
    userRating,
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let { topicPageId, vote, rating } = body;

  // Validate rating is 1-5 if provided
  if (rating && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  // Derive vote from rating using shared logic
  if (rating && !vote) {
    try {
      vote = ratingToVote(rating);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  if (!topicPageId || (!vote && !rating)) {
    return NextResponse.json(
      { error: "topicPageId and (vote or rating) are required" },
      { status: 400 }
    );
  }

  await connectMongoDB();

  // 1) Logic for Authenticated Users
  const userId = session?.user?.id || session?.user?.mongoId;
  if (userId) {
    const existingVote = await TopicPageVote.findOne({ topicPageId, userId: userId });

    if (existingVote) {
      // Logic for updating existing vote
      const oldVote = existingVote.vote;
      const oldRating = existingVote.rating;

      if (oldVote === vote && oldRating === rating) {
        const page = await TopicPage.findById(topicPageId).select("worthIt rating").lean();
        return NextResponse.json({
          worthIt: page.worthIt,
          rating: page.rating,
          userVote: vote,
          userRating: rating,
        });
      }

      existingVote.vote = vote;
      existingVote.rating = rating;
      await existingVote.save();

      const updateQuery = { $inc: {} };
      if (oldVote !== vote) {
        updateQuery.$inc[`worthIt.${vote}`] = 1;
        updateQuery.$inc[`worthIt.${oldVote}`] = -1;
      }
      if (rating && rating !== oldRating) {
        updateQuery.$inc["rating.totalScore"] = rating - (oldRating || 0);
        if (!oldRating) updateQuery.$inc["rating.count"] = 1;
      }

      const updated = await TopicPage.findByIdAndUpdate(topicPageId, updateQuery, {
        new: true,
        select: "worthIt rating",
      });

      // Invalidate cache for this topic page
      revalidateTag(`worthit-${topicPageId}`);

      return NextResponse.json({
        worthIt: updated.worthIt,
        rating: updated.rating,
        userRating: rating,
      });
    } else {
      // First time voting
      await TopicPageVote.create({ topicPageId, userId, vote, rating });
      
      const updateQuery = { $inc: { [`worthIt.${vote}`]: 1 } };
      if (rating) {
        updateQuery.$inc["rating.totalScore"] = rating;
        updateQuery.$inc["rating.count"] = 1;
      }

      const updated = await TopicPage.findByIdAndUpdate(topicPageId, updateQuery, {
        new: true,
        select: "worthIt rating",
      });

      // Invalidate cache for this topic page
      revalidateTag(`worthit-${topicPageId}`);

      return NextResponse.json({
        worthIt: updated.worthIt,
        rating: updated.rating,
        userRating: rating,
      });
    }
  }

  // 2) Block Guests (Prevents spam/multiple ratings from single anonymous users)
  return NextResponse.json(
    { error: "Authentication required to rate content" },
    { status: 401 }
  );
}


