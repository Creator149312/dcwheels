import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Question from "@models/question";
import QuestionVote from "@models/questionvote"
import User from "@models/user";
import Reaction from "@models/reaction";

export async function POST(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, text, contentType, contentId, options, contentSlug, contentTags } = await req.json();

    if (!type || !text || !contentType || !contentId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let finalOptions = [];
    if (type === "yesno") finalOptions = ["Yes", "No"];
    if (type === "multi") {
      if (!options || options.length < 2) {
        return NextResponse.json(
          { error: "Multi-choice needs 2+ options" },
          { status: 400 }
        );
      }
      finalOptions = options;
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build tags: slug-derived tag + parent content tags
    // Slug tag: strip numeric prefix from slug (e.g. "1539104-jujutsu-kaisen" → "jujutsu-kaisen")
    const derivedTags = [];
    if (contentSlug) {
      const slugTag = contentSlug.replace(/^\d+-/, "").toLowerCase().trim();
      if (slugTag) derivedTags.push(slugTag);
    }
    if (Array.isArray(contentTags)) {
      for (const t of contentTags) {
        const cleaned = t.toLowerCase().trim();
        if (cleaned && !derivedTags.includes(cleaned)) derivedTags.push(cleaned);
      }
    }

    const question = await Question.create({
      type,
      text,
      contentType,
      contentId,
      options: finalOptions,
      createdBy: user._id,
      contentSlug: contentSlug || null,
      tags: derivedTags,
    });

    return NextResponse.json(question, { status: 201 });
  } catch (err) {
    console.error("Error creating question:", err);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const currentUser = session
      ? await User.findOne({ email: session.user.email })
      : null;

    const questions = await Question.find({ contentType, contentId })
      .populate("createdBy", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    const enhanced = await Promise.all(
      questions.map(async (q) => {
        // ✅ Likes
        const likesCount = await Reaction.countDocuments({
          entityType: "question",
          entityId: q._id,
          reactionType: "like",
        });

        const likedByCurrentUser = currentUser
          ? await Reaction.exists({
              entityType: "question",
              entityId: q._id,
              reactionType: "like",
              userId: currentUser._id,
            })
          : false;

        // ✅ Votes
        const voteCounts = await QuestionVote.aggregate([
          { $match: { questionId: q._id } },
          {
            $group: {
              _id: "$optionIndex",
              count: { $sum: 1 },
            },
          },
        ]);

        const voteMap = Array(q.options.length).fill(0);
        voteCounts.forEach((vc) => {
          voteMap[vc._id] = vc.count;
        });

        const userVote = currentUser
          ? await QuestionVote.findOne({
              questionId: q._id,
              userId: currentUser._id,
            })
          : null;

        return {
          ...q,
          likesCount,
          likedByCurrentUser: !!likedByCurrentUser,
          voteCounts: voteMap,
          userVoteIndex: userVote?.optionIndex ?? null,
        };
      })
    );

    return NextResponse.json(enhanced, { status: 200 });
  } catch (err) {
    console.error("Error fetching questions:", err);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
