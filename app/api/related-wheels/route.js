// app/api/related-wheels/route.js
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { apiError, isValidObjectId } from "@/lib/apiHelpers";

export async function GET(req) {
  await connectMongoDB();

  // Parse query params
  const { searchParams } = new URL(req.url);
  const tagsParam = searchParams.get("tags");
  const currentId = searchParams.get("id"); // optional: exclude current wheel

  if (!tagsParam) {
    return NextResponse.json({ error: "Tags required" }, { status: 400 });
  }

  if (currentId && !isValidObjectId(currentId)) {
    return NextResponse.json({ error: "Invalid wheel ID format" }, { status: 400 });
  }

  const tagArray = tagsParam.split(",");

  try {
    const query = { tags: { $in: tagArray } };
    if (currentId) {
      query._id = { $ne: currentId }; // exclude current wheel
    }

    const related = await Wheel.find(query).limit(10).lean();

    return NextResponse.json(related);
  } catch (err) {
    return apiError(err, "Failed to fetch related wheels");
  }
}
