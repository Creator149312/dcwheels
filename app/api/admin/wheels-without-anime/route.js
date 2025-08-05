// app/api/admin/wheels-without-anime/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@/models/wheel";

export async function GET() {
  try {
    await connectMongoDB();

    const wheels = await Wheel.find({
      $or: [
        { relatedTo: { $exists: false } },
        { "relatedTo.type": { $ne: "anime" } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(1500)
      .lean();

    return NextResponse.json({ wheels });
  } catch (error) {
    console.error("Error fetching wheels:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
