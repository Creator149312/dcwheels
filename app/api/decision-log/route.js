import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import DecisionLog from "@models/decisionLog";
import { sessionUserId } from "@utils/SessionData";

export async function POST(req) {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { wheelId, wheelTitle, result, note } = body ?? {};

    if (!wheelId || !result) {
      return NextResponse.json(
        { error: "wheelId and result are required" },
        { status: 400 }
      );
    }

    const log = await DecisionLog.create({
      userId,
      wheelId: String(wheelId),
      wheelTitle: String(wheelTitle || "").slice(0, 200),
      result: String(result).slice(0, 500),
      note: String(note || "").slice(0, 500),
    });

    return NextResponse.json({ ok: true, id: log._id });
  } catch (err) {
    console.error("Decision log POST error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ decisions: [] }, { status: 401 });
    }

    const decisions = await DecisionLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ decisions });
  } catch (err) {
    console.error("Decision log GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
