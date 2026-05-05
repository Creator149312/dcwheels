import { NextResponse } from "next/server";
import { getGlobalSpinStories } from "@lib/spinStories";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    const stories = await getGlobalSpinStories(limit, skip);

    return NextResponse.json({ stories });
  } catch (err) {
    console.error("Global feed fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
