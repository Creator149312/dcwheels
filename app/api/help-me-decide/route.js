import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Question from "@models/question";
import QuestionVote from "@models/questionvote";
import User from "@models/user";
import Wheel from "@models/wheel";

export async function GET(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(req.url);
    const rawLimit = Number(searchParams.get("limit") || 20);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(rawLimit, 50))
      : 20;

    const currentUser = session?.user?.email
      ? await User.findOne({ email: session.user.email }).select("_id").lean()
      : null;

    const questions = await Question.find({
      contentType: "wheel",
      type: { $in: ["yesno", "multi"] },
    })
      .populate("createdBy", "name avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (questions.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const questionIds = questions.map((q) => q._id);
    const wheelIds = [...new Set(questions.map((q) => String(q.contentId)))];

    // Batch: all vote counts in one aggregate
    const rawVoteCounts = await QuestionVote.aggregate([
      { $match: { questionId: { $in: questionIds } } },
      {
        $group: {
          _id: { questionId: "$questionId", optionIndex: "$optionIndex" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build map: questionId (string) → count array
    const voteMap = new Map();
    for (const q of questions) {
      voteMap.set(String(q._id), Array(q.options.length).fill(0));
    }
    for (const vc of rawVoteCounts) {
      const qId = String(vc._id.questionId);
      const arr = voteMap.get(qId);
      if (arr && vc._id.optionIndex >= 0 && vc._id.optionIndex < arr.length) {
        arr[vc._id.optionIndex] = vc.count;
      }
    }

    // Batch: user votes in one query
    const userVoteMap = new Map(); // questionId (string) → optionIndex
    if (currentUser) {
      const userVotes = await QuestionVote.find({
        questionId: { $in: questionIds },
        userId: currentUser._id,
      })
        .select("questionId optionIndex")
        .lean();
      for (const v of userVotes) {
        userVoteMap.set(String(v.questionId), v.optionIndex);
      }
    }

    // Batch: wheel metadata
    const wheels = await Wheel.find({ _id: { $in: wheelIds } })
      .select("title description")
      .lean();
    const wheelById = new Map(wheels.map((w) => [String(w._id), w]));

    const feed = questions.map((q) => {
      const qId = String(q._id);
      const wheel = wheelById.get(String(q.contentId));
      return {
        ...q,
        voteCounts: voteMap.get(qId) ?? Array(q.options.length).fill(0),
        userVoteIndex: userVoteMap.has(qId) ? userVoteMap.get(qId) : null,
        wheel: wheel
          ? { _id: wheel._id, title: wheel.title, description: wheel.description }
          : null,
      };
    });

    return NextResponse.json(feed, { status: 200 });
  } catch (err) {
    console.error("Error fetching Help Me Decide feed:", err);
    return NextResponse.json(
      { error: "Failed to fetch Help Me Decide feed" },
      { status: 500 }
    );
  }
}

