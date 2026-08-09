import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { sessionUser } from "@utils/SessionData";
import mongoose from "mongoose";

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
    const sessionData = await sessionUser("_id email");
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId: sessionUserId, user: sessionUserDoc } = sessionData;

    const { id } = params;
    const { title, description, data, wheelData, relatedTopics, tags, type } =
      await request.json();

    await connectMongoDB();
    const existing = await Wheel.findById(id).select("userId createdBy").lean();
    if (!existing) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }
    const wheelUserId = existing.userId ? String(existing.userId) : null;

    // If the wheel has no userId, backfill it from the legacy createdBy email
    // when the current session matches that email.
    if (!wheelUserId && existing.createdBy && existing.createdBy.toLowerCase() === sessionUserDoc.email?.toLowerCase()) {
      await Wheel.findByIdAndUpdate(id, { userId: new mongoose.Types.ObjectId(sessionUserId) });
    } else if (wheelUserId !== String(sessionUserId)) {
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
      ...(type && ["basic", "quiz"].includes(type) ? { wheelType: type } : {}),
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

export async function PATCH(request, { params }) {
  try {
    const sessionData = await sessionUser("_id email");
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId: sessionUserId, user: sessionUserDoc } = sessionData;
    const { id } = params;
    const body = await request.json();

    await connectMongoDB();
    const wheel = await Wheel.findById(id).select("userId createdBy isPublic").lean();
    if (!wheel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const wheelUserId = wheel.userId ? String(wheel.userId) : null;

    // If the wheel has no userId, backfill it from the legacy createdBy email
    // when the current session matches that email.
    if (!wheelUserId && wheel.createdBy && wheel.createdBy.toLowerCase() === sessionUserDoc.email?.toLowerCase()) {
      await Wheel.findByIdAndUpdate(id, { userId: new mongoose.Types.ObjectId(sessionUserId) });
    } else if (wheelUserId !== String(sessionUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow toggling isPublic via PATCH — full updates go through PUT.
    if (typeof body.isPublic !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await Wheel.findByIdAndUpdate(id, { isPublic: body.isPublic });
    return NextResponse.json({ ok: true, isPublic: body.isPublic });
  } catch (e) {
    console.error("PATCH /api/wheel/[id] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    await connectMongoDB();

    let list = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      list = await Wheel.findById(id).lean();
    }
    if (!list) {
      list = await Wheel.findOne({ slug: id }).lean();
    }

    if (!list) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }

    return NextResponse.json({ list }, { status: 200 });
  } catch (e) {
    console.error("GET /api/wheel/[id] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
