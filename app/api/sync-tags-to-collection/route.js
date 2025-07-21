// app/api/sync-tags-to-collection/route.js
import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import Wheel from '@models/wheel';
import Tag from '@models/tag';

export async function POST(req) {
  await connectMongoDB();
  const { limit } = await req.json();

  try {
    const query = { tags: { $exists: true, $not: { $size: 0 } } };
    const wheels = limit && limit > 0
      ? await Wheel.find(query).limit(limit)
      : await Wheel.find(query);

    const tagCountMap = new Map();

    // Step 1: Collect all tags and count usage
    for (const wheel of wheels) {
      for (const tag of wheel.tags || []) {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          tagCountMap.set(normalized, (tagCountMap.get(normalized) || 0) + 1);
        }
      }
    }

    const updatedTags = [];

    // Step 2: Upsert tags into the Tag collection
    for (const [tagName, count] of tagCountMap.entries()) {
      const result = await Tag.findOneAndUpdate(
        { name: tagName },
        { $inc: { usageCount: count } },
        { upsert: true, new: true }
      );
      updatedTags.push(result.name);
    }

    return NextResponse.json({
      message: `Tags synced from ${wheels.length} wheel(s)`,
      updatedTags,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
