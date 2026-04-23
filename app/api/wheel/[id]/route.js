import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";

// Strip base64 images from segment data before persisting to DB.
function sanitizeSegments(data) {
  if (!Array.isArray(data)) return data;
  return data.map((seg) => {
    if (seg?.image && typeof seg.image === "string" && seg.image.startsWith("data:")) {
      const { image, ...rest } = seg;
      return rest;
    }
    return seg;
  });
}

export async function PUT(request, { params }) {
  const {id} = params;

  const { title, description, data, wheelData, relatedTopics, tags } = await request.json();
  await connectMongoDB();

  // Only patch relatedTopics / tags when the client actually sent them.
  // Otherwise a partial update (e.g. title-only save) would clobber those
  // fields to undefined.
  const update = {
    title,
    description,
    data: sanitizeSegments(data),
    wheelData,
  };
  if (Array.isArray(relatedTopics)) {
    update.relatedTopics = relatedTopics;
  }
  if (Array.isArray(tags)) {
    update.tags = tags.filter(
      (t) => typeof t === "string" && t.trim().length > 0
    );
  }

  await Wheel.findByIdAndUpdate(id, update);
  return NextResponse.json({ message: "Wheel updated" }, { status: 200 });
}

export async function GET(request, { params }) {
  const { id } = params;
  await connectMongoDB();
  // .lean() returns a plain JS object instead of a hydrated Mongoose document.
  // Safe here because we only serialise to JSON — no mongoose instance methods used.
  const list = await Wheel.findOne({ _id: id }).lean();
  return NextResponse.json({ list }, { status: 200 });
}
