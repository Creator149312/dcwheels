import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

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
  try {
    // Auth: only the wheel’s original creator may update it. We compare
    // the session email against the stored `createdBy` so a logged-in
    // user can’t hijack another user’s wheel by guessing its id.
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { title, description, data, wheelData, relatedTopics, tags } =
      await request.json();

    await connectMongoDB();
    const existing = await Wheel.findById(id).select("createdBy").lean();
    if (!existing) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }
    if (existing.createdBy !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
  } catch (e) {
    console.error("PUT /api/wheel/[id] failed:", e);
    return NextResponse.json(
      { error: "Failed to update wheel" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  const { id } = params;
  await connectMongoDB();
  // .lean() returns a plain JS object instead of a hydrated Mongoose document.
  // Safe here because we only serialise to JSON — no mongoose instance methods used.
  const list = await Wheel.findOne({ _id: id }).lean();
  return NextResponse.json({ list }, { status: 200 });
}
