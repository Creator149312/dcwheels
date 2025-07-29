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

    // Basic list of banned/inappropriate tags (expand as needed)
    const bannedWords = [
      "nsfw", "porn", "hentai", "nude", "sex", "violence", "drugs",
      "kill", "murder", "terrorist", "weapon", "abuse"
    ];

    // Helper: clean and validate tags
    const cleanTag = (tag) => {
      const cleaned = tag
        .replace(/[^a-zA-Z0-9]/g, '') // only allow alphanumeric
        .trim()
        .toLowerCase();
      return cleaned;
    };

    for (const wheel of wheels) {
      const originalTags = wheel.tags || [];

      const cleanedTags = Array.from(
        new Set(
          originalTags
            .map(cleanTag)
            .filter(tag =>
              tag.length > 0 &&
              !bannedWords.includes(tag)
            )
        )
      ).slice(0, 15); // max 15 tags

      if (JSON.stringify(wheel.tags) !== JSON.stringify(cleanedTags)) {
        wheel.tags = cleanedTags;
        await wheel.save();
        updatedCount++;
      }
    }

    return NextResponse.json({ message: `Updated ${updatedCount} wheels.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
