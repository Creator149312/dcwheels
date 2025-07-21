import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";

export async function GET(req) {
  await connectMongoDB();

  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");

  if (!tag) {
    return NextResponse.json({ error: "Tag is required" }, { status: 400 });
  }

  try {
    const wheels = await Wheel.find({
      tags: { $elemMatch: { $regex: `^${tag}$`, $options: "i" } }
    }).select("title");

    return NextResponse.json({ wheels });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
