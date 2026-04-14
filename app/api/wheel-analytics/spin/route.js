import { NextResponse } from "next/server";
import { incrementWheelSpinCount } from "@lib/wheelAnalytics";

export async function POST(request) {
  try {
    const { wheelId } = await request.json();

    if (!wheelId) {
      return NextResponse.json({ error: "wheelId is required" }, { status: 400 });
    }

    await incrementWheelSpinCount(wheelId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to increment spin count" },
      { status: 500 }
    );
  }
}
