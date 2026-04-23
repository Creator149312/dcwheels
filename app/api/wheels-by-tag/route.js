import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";

export async function GET(req) {
  try {
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");

    // ✅ 1. Parse pagination parameters
    // Default to limit 20, skip 0 if not provided
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit")) || 20));
    const skip = Math.max(0, parseInt(searchParams.get("skip")) || 0);

    if (!tag) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    // Exact-match on the normalised (lowercased) tag so the query can fully
    // use the `tags: 1` multikey index. Prior case-insensitive regex caused
    // only partial index usage on popular tags.
    const normalized = tag.toLowerCase().trim();

    const wheels = await Wheel.find({ tags: normalized })
      .select("title slug wheelPreview")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ wheels });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import { connectMongoDB } from "@/lib/mongodb";
// import Wheel from "@models/wheel";

// export async function GET(req) {
//   await connectMongoDB();

//   const { searchParams } = new URL(req.url);
//   const tag = searchParams.get("tag");

//   if (!tag) {
//     return NextResponse.json({ error: "Tag is required" }, { status: 400 });
//   }

//   try {
//     const wheels = await Wheel.find({
//       tags: { $elemMatch: { $regex: `^${tag}$`, $options: "i" } }
//     }).select("title");

//     return NextResponse.json({ wheels });
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
