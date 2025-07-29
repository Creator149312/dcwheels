// app/api/sync-tags-to-collection/route.js
import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import Wheel from '@models/wheel';
import Tag from '@models/tag';

// export async function POST(req) {
//   await connectMongoDB();
//   const { limit } = await req.json();

//   try {
//     const query = { tags: { $exists: true, $not: { $size: 0 } } };
//     const wheels = limit && limit > 0
//       ? await Wheel.find(query).limit(limit)
//       : await Wheel.find(query);

//     const tagCountMap = new Map();

//     // Banned/inappropriate tags
//     const bannedWords = [
//       "nsfw", "porn", "hentai", "nude", "sex", "violence", "drugs",
//       "kill", "murder", "terrorist", "weapon", "abuse"
//     ];

//     // Cleaning function: alphanumeric only, lowercase, trimmed
//     const cleanTag = (tag) => {
//       return tag
//         .replace(/[^a-zA-Z0-9]/g, "") // remove symbols, emojis, dashes
//         .trim()
//         .toLowerCase();
//     };

//     // Step 1: Clean and update each wheel's tags
//     for (const wheel of wheels) {
//       const originalTags = wheel.tags || [];

//       const cleanedTags = Array.from(
//         new Set(
//           originalTags
//             .map(cleanTag)
//             .filter(tag =>
//               tag.length > 0 &&
//               !bannedWords.includes(tag)
//             )
//         )
//       ).slice(0, 15); // Enforce max 15 tags

//       if (JSON.stringify(wheel.tags) !== JSON.stringify(cleanedTags)) {
//         wheel.tags = cleanedTags;
//         await wheel.save();
//       }

//       // Count cleaned tags for syncing to Tag collection
//       for (const tag of cleanedTags) {
//         tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
//       }
//     }

//     const updatedTags = [];

//     // Step 2: Sync cleaned tags into Tag collection
//     for (const [tagName, count] of tagCountMap.entries()) {
//       const result = await Tag.findOneAndUpdate(
//         { name: tagName },
//         { $inc: { usageCount: count } },
//         { upsert: true, new: true }
//       );
//       updatedTags.push(result.name);
//     }

//     return NextResponse.json({
//       message: `Cleaned and synced tags from ${wheels.length} wheel(s)`,
//       updatedTags,
//     });
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }


// export async function POST() {
//   await connectMongoDB();

//   try {
//     const tags = await Tag.find();
//     const tagGroups = new Map(); // key: cleaned name, value: array of tags

//     // Step 1: Group tags by cleaned name
//     for (const tag of tags) {
//       const cleaned = tag.name.replace(/\s+/g, "").toLowerCase();

//       if (!tagGroups.has(cleaned)) {
//         tagGroups.set(cleaned, []);
//       }

//       tagGroups.get(cleaned).push(tag);
//     }

//     let updatedNames = 0;
//     let removedDuplicates = 0;

//     // Step 2: Merge duplicates safely
//     for (const [cleanedName, group] of tagGroups.entries()) {
//       if (group.length === 1) {
//         // Only one tag, just rename it if needed
//         const tag = group[0];
//         if (tag.name !== cleanedName) {
//           tag.name = cleanedName;
//           await tag.save();
//           updatedNames++;
//         }
//         continue;
//       }

//       // More than one tag with same cleaned name → merge
//       let keeper = group[0];
//       let totalUsage = keeper.usageCount;

//       for (let i = 1; i < group.length; i++) {
//         totalUsage += group[i].usageCount;
//         await Tag.deleteOne({ _id: group[i]._id });
//         removedDuplicates++;
//       }

//       // Now update the keeper's name and usage
//       keeper.name = cleanedName;
//       keeper.usageCount = totalUsage;
//       await keeper.save();
//       updatedNames++;
//     }

//     return NextResponse.json({
//       message: "Tags cleaned and merged successfully.",
//       updatedNames,
//       removedDuplicates,
//       finalCount: tagGroups.size,
//     });
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

export async function POST() {
  await connectMongoDB();

  try {
    // ✅ Step 1: Reset all usage counts to 0
    await Tag.updateMany({}, { usageCount: 0 });

    // ✅ Step 2: Get all wheels with tags
    const wheels = await Wheel.find({
      tags: { $exists: true, $not: { $size: 0 } }
    });

    const tagCountMap = new Map();

    // ✅ Step 3: Count tag usage from wheels
    for (const wheel of wheels) {
      for (const rawTag of wheel.tags || []) {
        const tag = rawTag.trim().toLowerCase();
        if (!tag) continue;

        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      }
    }

    const updatedTags = [];

    // ✅ Step 4: Update each tag in DB with correct count
    for (const [tagName, count] of tagCountMap.entries()) {
      const result = await Tag.findOneAndUpdate(
        { name: tagName },
        { $set: { usageCount: count } },
        { upsert: true, new: true }
      );
      updatedTags.push(result.name);
    }

    return NextResponse.json({
      message: `Tags synced from ${wheels.length} wheels.`,
      updatedTags,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



