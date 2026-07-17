// app/api/admin/assign-related/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@/models/wheel";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

/**
 * Adds a {type, id} entry into the wheel's relatedTopics array. Idempotent —
 * sending the same {type, id} twice is a no-op thanks to $addToSet.
 *
 * Backwards-compatible body: clients that still send `relatedTo: {type, id}`
 * (the legacy single-object shape) are accepted and translated into a
 * single-element add. Newer clients should send `topic: {type, id}` directly.
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const body = await req.json();
    const { wheelId, relatedTopics } = body;
    const topic = body.topic || body.relatedTo;

    if (!wheelId) {
      return NextResponse.json({ error: "Missing wheelId" }, { status: 400 });
    }

    // 1. Full array replacement (preferred for UI managers)
    if (Array.isArray(relatedTopics)) {
      const updated = await Wheel.findByIdAndUpdate(
        wheelId,
        { $set: { relatedTopics: relatedTopics.map(t => ({ type: t.type, id: String(t.id) })) } },
        { new: true }
      );
      return NextResponse.json({ success: true, updated });
    }

    // 2. Singular add (idempotent, for quick actions)
    if (!topic?.type || !topic?.id) {
      return NextResponse.json({ error: "Missing topic fields" }, { status: 400 });
    }

    const updated = await Wheel.findByIdAndUpdate(
      wheelId,
      {
        $addToSet: {
          relatedTopics: { type: topic.type, id: String(topic.id) },
        },
      },
      { new: true }
    );

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Error assigning relatedTopics:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
