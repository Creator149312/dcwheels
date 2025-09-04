import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Question from "@models/question";
import QuestionVote from "@models/questionvote"
import User from "@models/user";

export async function PATCH(req, { params }) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { action, optionIndex } = await req.json();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const question = await Question.findById(id).populate(
      "createdBy",
      "name avatar"
    );
    if (!question) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ Toggle like
    if (action === "like") {
      const alreadyLiked = question.likes.some(
        (u) => String(u) === String(user._id)
      );
      if (alreadyLiked) {
        question.likes = question.likes.filter(
          (u) => String(u) !== String(user._id)
        );
      } else {
        question.likes.push(user._id);
      }
      await question.save();
    }

    // ✅ Record vote (only once per user)
    if (
      action === "vote" &&
      (question.type === "yesno" || question.type === "multi")
    ) {
      const existingVote = await QuestionVote.findOne({
        questionId: question._id,
        userId: user._id,
      });

      if (existingVote) {
        // ✅ User already voted — update their vote
        existingVote.optionIndex = optionIndex;
        await existingVote.save();
      } else {
        // ✅ First-time vote
        await QuestionVote.create({
          questionId: question._id,
          userId: user._id,
          optionIndex,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating question:", err);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const userId = session.user.id;

    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (String(question.createdBy) !== userId /* && !session.user.isAdmin */) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Question.findByIdAndDelete(id);
    await QuestionVote.deleteMany({ questionId: id }); // ✅ Clean up votes

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting question:", err);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
