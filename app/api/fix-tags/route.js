// app/api/fix-tags/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";

export async function POST(req) {
  await connectMongoDB();

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam === "all" ? 0 : parseInt(limitParam || "200");

  try {
    const query = { tags: { $exists: true, $not: { $size: 0 } } };
    const wheels = await Wheel.find(query).limit(limit || 0);

    let updatedCount = 0;

    for (const wheel of wheels) {
      const newTags = wheel.tags.flatMap((tag) =>
        tag
          .split(/[&,\/-]/)
          .map((t) => t.trim())
          .filter(Boolean)
      );

      const uniqueTags = [...new Set(newTags)];

      if (JSON.stringify(wheel.tags) !== JSON.stringify(uniqueTags)) {
        wheel.tags = uniqueTags;
        await wheel.save();
        updatedCount++;
      }
    }

    return NextResponse.json({ message: `Updated ${updatedCount} wheels.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
