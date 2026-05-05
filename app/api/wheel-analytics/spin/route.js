import { NextResponse } from "next/server";
import { incrementWheelSpinCount } from "@lib/wheelAnalytics";

export async function POST(request) {
  try {
    const { wheelId, segmentLabel } = await request.json();

    if (!wheelId) {
      return NextResponse.json({ error: "wheelId is required" }, { status: 400 });
    }

    // segmentLabel is optional — older clients (and any future server-side
    // callers) can still bump just the total spin count. The lib layer
    // sanitizes / validates the label before it touches Mongo.
    await incrementWheelSpinCount(wheelId, segmentLabel);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to increment spin count" },
      { status: 500 }
    );
  }
}
