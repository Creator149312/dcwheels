// app/api/related-wheels/route.js
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectMongoDB();

  // Parse query params
  const { searchParams } = new URL(req.url);
  const tagsParam = searchParams.get("tags");
  const currentId = searchParams.get("id"); // optional: exclude current wheel

  if (!tagsParam) {
    return NextResponse.json({ error: "Tags required" }, { status: 400 });
  }

  const tagArray = tagsParam.split(",");

  try {
    const query = { tags: { $in: tagArray } };
    if (currentId) {
      query._id = { $ne: currentId }; // exclude current wheel
    }

    const related = await Wheel.find(query).limit(10).exec();

    // console.log("Related wheels" + related);
    return NextResponse.json(related);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
