// app/api/migrate-tags/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@/models/wheel"; // adjust path if needed

await connectMongoDB();

export async function POST(req) {
  console.log("inside");
  const { limit } = await req.json();

  try {
    // Get wheels that don't yet have tags field
    const wheels = await Wheel.find({
      tags: { $exists: false },
    }).limit(limit || 5);

    const results = [];

    for (const wheel of wheels) {
      // Set tags to [category] if exists, else empty array
      wheel.tags = wheel.category ? [wheel.category] : [];
      // Remove category field
      wheel.category = undefined;
      await wheel.save();
      results.push(wheel._id);
    }

    return NextResponse.json({
      message: `Migrated ${results.length} wheels`,
      migratedIds: results,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
