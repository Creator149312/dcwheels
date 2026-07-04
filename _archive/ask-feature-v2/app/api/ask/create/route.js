import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import AskDilemma from "@models/askDilemma";
import User from "@models/user";

/**
 * POST /api/ask/create
 * Create a new dilemma/poll
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { question, options, tags = [], expiresAt, isPublic = true } = body;

    // Validate
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ message: "Question is required" }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
      return NextResponse.json({ message: "2-4 options required" }, { status: 400 });
    }
    if (!expiresAt) {
      return NextResponse.json({ message: "Expiration date is required" }, { status: 400 });
    }

    // Create dilemma
    const dilemma = new AskDilemma({
      userId: user._id,
      question: question.trim(),
      options: options.map((opt) => ({
        text: typeof opt === "string" ? opt.trim() : opt.text,
        voteCount: 0,
      })),
      tags: Array.isArray(tags)
        ? tags
            .map((t) => (typeof t === "string" ? t.toLowerCase().trim() : t))
            .filter(Boolean)
        : [],
      expiresAt: new Date(expiresAt),
      status: "active",
      isPublic: !!isPublic,
    });

    await dilemma.save();

    return NextResponse.json({ id: String(dilemma._id), message: "Dilemma created" });
  } catch (err) {
    console.error("POST /api/ask/create error:", err);
    return NextResponse.json({ message: err.message || "Failed to create dilemma" }, { status: 500 });
  }
}
