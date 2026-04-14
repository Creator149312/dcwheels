import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getWheelAnalytics } from "@lib/wheelAnalytics";

export async function GET(_request, { params }) {
  try {
    const { wheelId } = params;

    if (!mongoose.Types.ObjectId.isValid(wheelId)) {
      return NextResponse.json({ error: "Invalid wheelId" }, { status: 400 });
    }

    const analytics = await getWheelAnalytics(wheelId);
    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch wheel analytics" },
      { status: 500 }
    );
  }
}
