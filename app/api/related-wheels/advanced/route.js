import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";

// export async function GET(req) {
//   const reqStart = Date.now();
//   await connectMongoDB();

//   // Parse query params
//   const { searchParams } = new URL(req.url);
//   const tagsParam = searchParams.get("tags");
//   const currentId = searchParams.get("id"); // optional: exclude current wheel

//   if (!tagsParam) {
//     return NextResponse.json({ error: "Tags required" }, { status: 400 });
//   }

//   const tagArray = tagsParam.split(",");

//   try {
//     // Build aggregation pipeline
//     const pipeline = [
//       // Exclude current wheel if provided
//       {
//         $match: currentId ? { _id: { $ne: currentId } } : {},
//       },
//       // Compute overlap count between current tags and candidate tags
//       {
//         $addFields: {
//           overlapCount: {
//             $size: { $setIntersection: ["$tags", tagArray] },
//           },
//         },
//       },
//       // Only keep wheels with at least 1 overlapping tag
//       { $match: { overlapCount: { $gte: 1 } } },
//       // Sort by overlap count (descending) and recency
//       { $sort: { overlapCount: -1, createdAt: -1 } },
//       // Limit to a larger candidate pool
//       { $limit: 20 },
//     ];

//     const candidates = await Wheel.aggregate(pipeline);

//     // Diversity injection in Node.js
//     const topOverlap = candidates.slice(0, 7); // 7 highly related
//     const shuffled = candidates.slice(7).sort(() => 0.5 - Math.random());
//     const diverseSet = [...topOverlap, ...shuffled.slice(0, 3)]; // 3 diverse

//     console.log("Total time for Request in Wheels = " + (Date.now() - reqStart));

//     return NextResponse.json(diverseSet);
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

//advanced model
export async function GET(req) {
  // const reqStart = Date.now();
  await connectMongoDB();

  // Parse query params
  const { searchParams } = new URL(req.url);
  const tagsParam = searchParams.get("tags");
  const currentId = searchParams.get("id"); // optional: exclude current wheel

  // console.log("Current ID = "+ currentId);
  if (!tagsParam) {
    return NextResponse.json({ error: "Tags required" }, { status: 400 });
  }

  const tagArray = tagsParam.split(",");

  try {
    // Build optimized aggregation pipeline
    const pipeline = [
      // 2. Filter early: only wheels with at least one tag in tagArray
      {
        $match: {
          tags: { $in: tagArray },
          ...(currentId ? { _id: { $ne: currentId } } : {}),
        },
      },

      // 3. Cheaper overlap calculation using $filter
      {
        $addFields: {
          overlapCount: {
            $size: {
              $filter: {
                input: "$tags",
                as: "tag",
                cond: { $in: ["$$tag", tagArray] },
              },
            },
          },
        },
      },

      // Only keep wheels with overlapCount >= 1
      { $match: { overlapCount: { $gte: 1 } } },

      // 4. Sort and limit earlier
      { $sort: { overlapCount: -1, createdAt: -1 } },
      { $limit: 20 }, // candidate pool

      // 5. Return only fields needed for card display — keeps payload small
      {
        $project: {
          _id: 1,
          title: 1,
          wheelPreview: 1,
          tags: 1,
          overlapCount: 1,
        },
      },
    ];

    const candidates = await Wheel.aggregate(pipeline);

    // Diversity injection in Node.js
    const topOverlap = candidates.slice(0, 7); // 7 highly related
    const shuffled = candidates.slice(7).sort(() => 0.5 - Math.random());
    const diverseSet = [...topOverlap, ...shuffled.slice(0, 3)]; // 3 diverse

    // console.log("Total time for Request = " + (Date.now() - reqStart));
    return NextResponse.json(diverseSet);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
