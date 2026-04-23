// app/api/admin/wheels-without-anime/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@/models/wheel";

export async function GET() {
  try {
    await connectMongoDB();

    // Wheels whose relatedTopics array has no entry of type "anime".
    // Equivalent to the legacy `relatedTo` check but works on the new
    // many-to-many schema — a wheel linked to *any* anime topic is
    // excluded, a wheel linked only to other types (or nothing) is listed.
    const wheels = await Wheel.find({
      $or: [
        { relatedTopics: { $exists: false } },
        { relatedTopics: { $size: 0 } },
        { "relatedTopics.type": { $nin: ["anime"] } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(2500)
      .lean();

    return NextResponse.json({ wheels });
  } catch (error) {
    console.error("Error fetching wheels:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
