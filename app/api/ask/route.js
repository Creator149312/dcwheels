import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import AskDilemma from "@models/askDilemma";
import User from "@models/user";
import { getActiveAsks } from "@lib/askStories";

// GET /api/ask?limit=20&skip=0&tag=marvel
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");
    const tag = searchParams.get("tag") || undefined;

    const asks = await getActiveAsks({ limit, skip, tag });
    return NextResponse.json({ asks });
  } catch (err) {
    console.error("GET /api/ask error:", err);
    return NextResponse.json({ error: "Failed to fetch dilemmas" }, { status: 500 });
  }
}

// POST /api/ask — create a new dilemma
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { question, options, expiresInHours = 24, tags = [], topicType, topicTags = [], derivedFromWheelId, topicPageId } = await req.json();

    if (!question?.trim() || question.trim().length > 500) {
      return NextResponse.json({ error: "Question must be 1–500 characters" }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
      return NextResponse.json({ error: "Provide 2–4 options" }, { status: 400 });
    }

    const cleanOptions = options.map((o) => {
      if (!o?.text?.trim()) throw new Error("Each option must have text");
      return {
        text: o.text.trim().slice(0, 100),
        imageUrl: o.imageUrl || undefined,
        catalogRef: o.catalogRef || undefined,
      };
    });

    const hours = Math.max(1, Math.min(168, Number(expiresInHours)));
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const dilemma = await AskDilemma.create({
      userId: user._id,
      question: question.trim(),
      options: cleanOptions,
      expiresAt,
      tags: (tags || []).slice(0, 5).map((t) => String(t).trim().toLowerCase()).filter(Boolean),
      topicType: topicType || "general",
      topicTags: (topicTags || []).slice(0, 8).map((t) => String(t).trim().toLowerCase()).filter(Boolean),
      derivedFromWheelId: derivedFromWheelId || undefined,
      topicPageId: topicPageId || undefined,
    });

    return NextResponse.json({ id: String(dilemma._id) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/ask error:", err);
    return NextResponse.json({ error: err.message || "Failed to create dilemma" }, { status: 500 });
  }
}
