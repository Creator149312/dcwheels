// app/api/admin/assign-related/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@/models/wheel";

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
    await connectMongoDB();

    const body = await req.json();
    const { wheelId } = body;
    const topic = body.topic || body.relatedTo;

    if (!wheelId || !topic?.type || !topic?.id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
