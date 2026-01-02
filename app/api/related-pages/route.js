import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";

export async function GET(req) {
  const reqStart = Date.now();
  await connectMongoDB();

  // Parse query params
  const { searchParams } = new URL(req.url);
  const tagsParam = searchParams.get("tags");
  const currentId = searchParams.get("id"); // optional: exclude current page

  if (!tagsParam) {
    return NextResponse.json({ error: "Tags required" }, { status: 400 });
  }

  const tagArray = tagsParam.split(",");

  try {
    // Build optimized aggregation pipeline
    const pipeline = [
      // Filter early: only pages with at least one tag in tagArray
      {
        $match: {
          tags: { $in: tagArray },
          ...(currentId ? { _id: { $ne: currentId } } : {})
        }
      },

      // Calculate overlap count using $filter
      {
        $addFields: {
          overlapCount: {
            $size: {
              $filter: {
                input: "$tags",
                as: "tag",
                cond: { $in: ["$$tag", tagArray] }
              }
            }
          }
        }
      },

      // Only keep pages with overlapCount >= 1
      { $match: { overlapCount: { $gte: 1 } } },

      // Sort and limit earlier
      { $sort: { overlapCount: -1, createdAt: -1 } },
      { $limit: 30 } // candidate pool
    ];

    const candidates = await TopicPage.aggregate(pipeline);

    // Diversity injection
    const topOverlap = candidates.slice(0, 7); // 7 highly related
    const shuffled = candidates.slice(7).sort(() => 0.5 - Math.random());
    const diverseSet = [...topOverlap, ...shuffled.slice(0, 3)]; // 3 diverse

    console.log("Total time for Request in Pages = " + (Date.now() - reqStart));

    return NextResponse.json(diverseSet);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
