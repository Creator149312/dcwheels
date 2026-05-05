import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import DecisionLog from "@models/decisionLog";
import { sessionUserId } from "@utils/SessionData";

const VALID_STATUSES = ["pending", "done", "dropped"];

export async function PATCH(req, { params }) {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body ?? {};

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // `userId` in the filter ensures users can only update their own logs.
    const log = await DecisionLog.findOneAndUpdate(
      { _id: id, userId },
      { $set: { status } },
      { new: true }
    );

    if (!log) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status: log.status });
  } catch (err) {
    console.error("Decision log PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
