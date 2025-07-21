import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@/models/wheel";

export async function GET(req) {
  await connectMongoDB();

  const { searchParams } = new URL(req.url);
  const tags = searchParams.getAll("tags");

  if (!tags || tags.length === 0) {
    return NextResponse.json({ wheels: [] });
  }

  try {
    const wheels = await Wheel.find({
      tags: { $elemMatch: { $regex: `^${tags}$`, $options: "i" } },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title");

    return NextResponse.json({ wheels });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
