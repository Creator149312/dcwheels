import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import DecisionLog from "@models/decisionLog";
import User from "@models/user";
import { sessionUserId } from "@utils/SessionData";

export async function POST(req) {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { wheelId, wheelTitle, result, resultImage, note, entityType, entityId, entitySlug } = body ?? {};

    if (!wheelId || !result) {
      return NextResponse.json(
        { error: "wheelId and result are required" },
        { status: 400 }
      );
    }

    // Resolve the user's `publicSpins` preference so the resulting log
    // row carries `isPublic` at write time. Storing it on the row (rather
    // than joining back to User on every feed read) lets the per-wheel
    // feed be a single indexed match — see the
    // `{ wheelId, isPublic, createdAt }` index in the model.
    const user = await User.findById(userId).select("publicSpins").lean();
    const isPublic = !!user?.publicSpins;

    const log = await DecisionLog.create({
      userId,
      wheelId: String(wheelId),
      wheelTitle: String(wheelTitle || "").slice(0, 200),
      result: String(result).slice(0, 500),
      resultImage: String(resultImage || "").slice(0, 1000),
      note: String(note || "").slice(0, 500),
      isPublic,
      entityType: String(entityType || "").slice(0, 50),
      entityId:   String(entityId   || "").slice(0, 100),
      entitySlug: String(entitySlug || "").slice(0, 300),
    });

    return NextResponse.json({ ok: true, id: log._id, isPublic });
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
