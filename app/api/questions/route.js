import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Question from "@models/question";
import QuestionVote from "@models/questionvote"
import User from "@models/user";
import ReactionTest from "@models/reactiontest";

export async function POST(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, text, contentType, contentId, options } = await req.json();

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

    const question = await Question.create({
      type,
      text,
      contentType,
      contentId,
      options: finalOptions,
      createdBy: user._id,
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
        const likesCount = await ReactionTest.countDocuments({
          entityType: "question",
          entityId: q._id,
          reactionType: "like",
        });

        const likedByCurrentUser = currentUser
          ? await ReactionTest.exists({
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
