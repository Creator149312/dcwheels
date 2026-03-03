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
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = parseInt(searchParams.get("skip")) || 0;

    if (!tag) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    // ✅ 2. Fetch only the required slice of data
    // Added 'slug' (or _id) to select so the frontend can build links
    const wheels = await Wheel.find({
      tags: { $elemMatch: { $regex: `^${tag}$`, $options: "i" } }
    })
      .select("title slug") // Ensure you select whatever you use for href
      .sort({ createdAt: -1 }) // Usually best to show newest wheels first
      .skip(skip)
      .limit(limit);

    // ✅ 3. Optional: Get total count for smarter frontend logic
    // const total = await Wheel.countDocuments({ 
    //   tags: { $elemMatch: { $regex: `^${tag}$`, $options: "i" } } 
    // });

    return NextResponse.json({ 
      wheels,
      // total // Include this if you want to show "Showing X of Y"
    });
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
