import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import AskDilemma from "@models/askDilemma";
import AskVote from "@models/askVote";
import User from "@models/user";
import { updateVoterStreak } from "@lib/updateVoterStreak";
import mongoose from "mongoose";

// POST /api/ask/[id]/vote
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid dilemma ID" }, { status: 400 });
    }

    const { optionId, rationale } = await req.json();
    if (!optionId) {
      return NextResponse.json({ error: "optionId is required" }, { status: 400 });
    }

    await connectMongoDB();

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const dilemma = await AskDilemma.findById(id);
    if (!dilemma) return NextResponse.json({ error: "Dilemma not found" }, { status: 404 });
    if (dilemma.status !== "active" || dilemma.expiresAt < new Date()) {
      return NextResponse.json({ error: "This dilemma is no longer active" }, { status: 409 });
    }

    // Validate optionId belongs to this dilemma
    const optionExists = dilemma.options.some((o) => String(o._id) === optionId);
    if (!optionExists) {
      return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    }

    // Check for duplicate vote (the unique index will also guard this)
    const existing = await AskVote.findOne({ askDilemmaId: id, userId: user._id });
    if (existing) {
      return NextResponse.json({ error: "You already voted on this dilemma" }, { status: 409 });
    }

    // Record vote
    await AskVote.create({
      askDilemmaId: id,
      userId: user._id,
      optionId,
      rationale: rationale?.trim?.()?.slice(0, 280) || undefined,
    });

    // Increment the cached voteCount on the chosen option
    await AskDilemma.updateOne(
      { _id: id, "options._id": optionId },
      { $inc: { "options.$.voteCount": 1 } }
    );

    updateVoterStreak(user._id).catch(() => {});

    // Return updated option vote counts
    const updated = await AskDilemma.findById(id).select("options").lean();
    const voteCounts = Object.fromEntries(
      updated.options.map((o) => [String(o._id), o.voteCount])
    );

    return NextResponse.json({ success: true, voteCounts });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json({ error: "You already voted on this dilemma" }, { status: 409 });
    }
    console.error("POST /api/ask/[id]/vote error:", err);
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }
}
