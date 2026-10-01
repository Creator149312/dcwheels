import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { sessionUser } from "@utils/SessionData";
import { validateQuizSegments } from "@utils/Validator";
import { revalidateTag, revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { syncWheelIndexedState } from "@lib/wheelIndexGate";
import { validateContentSafety, validateWheelSegmentsSafety } from "@lib/contentSafety";

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
    const { userId: sessionUserId } = sessionData;

    const { id } = params;
    const { title, description, data, wheelData, relatedTopics, tags, type, updatedAt } =
      await request.json();

    await connectMongoDB();
    const existing = await Wheel.findById(id).select("userId updatedAt wheelType").lean();
    if (!existing) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }
    const wheelUserId = existing.userId ? String(existing.userId) : null;

    if (wheelUserId !== String(sessionUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Optimistic locking check: if client sent an updatedAt timestamp, verify
    // the wheel has not been updated by another tab or session in the meantime.
    if (updatedAt && existing.updatedAt) {
      const clientTime = new Date(updatedAt).getTime();
      const serverTime = new Date(existing.updatedAt).getTime();
      if (!isNaN(clientTime) && !isNaN(serverTime) && serverTime > clientTime) {
        return NextResponse.json(
          {
            error:
              "This wheel was updated in another session or tab. Please reload to see the latest version before saving.",
            conflict: true,
          },
          { status: 409 }
        );
      }
    }

    if (type === "quiz" || existing.wheelType === "quiz") {
      const quizErr = validateQuizSegments(data);
      if (quizErr) {
        return NextResponse.json({ error: quizErr }, { status: 400 });
      }
    }

    // Tier 1 Content Safety Gate (Write-Time Hard Reject)
    const safetyCheck = validateContentSafety([
      title,
      description,
      ...(Array.isArray(tags) ? tags : []),
    ]);
    if (!safetyCheck.isSafe) {
      return NextResponse.json({ error: safetyCheck.error }, { status: 400 });
    }

    if (Array.isArray(data)) {
      const segmentsSafetyCheck = validateWheelSegmentsSafety(data);
      if (!segmentsSafetyCheck.isSafe) {
        return NextResponse.json({ error: segmentsSafetyCheck.error }, { status: 400 });
      }
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

    const updatedWheel = await Wheel.findByIdAndUpdate(id, update, { new: true }).lean();

    // Re-evaluate indexing gate for updated title/segments/description
    await syncWheelIndexedState(id);

    // Invalidate Next.js cache so deleted segments or title changes take effect immediately
    try {
      revalidateTag(`wheel-${id}`);
      if (updatedWheel?.userId) {
        revalidateTag(`profile-${updatedWheel.userId}`);
      }
      if (updatedWheel?.slug) {
        revalidatePath(`/wheels/${updatedWheel.slug}`);
      }
      revalidatePath(`/wheels/${id}`);
    } catch (cacheErr) {
      console.warn("Revalidation error after wheel update:", cacheErr);
    }

    return NextResponse.json({ message: "Wheel updated", updatedAt: updatedWheel?.updatedAt }, { status: 200 });
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
    const { userId: sessionUserId } = sessionData;
    const { id } = params;
    const body = await request.json();

    await connectMongoDB();
    const wheel = await Wheel.findById(id).select("userId isPublic indexed").lean();
    if (!wheel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const wheelUserId = wheel.userId ? String(wheel.userId) : null;

    if (wheelUserId !== String(sessionUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow toggling isPublic via PATCH — full updates go through PUT.
    if (typeof body.isPublic !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 🛡️ SEO & Permanence Policy (One-way publish door):
    // Once a wheel has been published publicly, it cannot be reverted to private.
    // It must be deleted if the creator wants it removed.
    if (wheel.isPublic && body.isPublic === false) {
      return NextResponse.json(
        {
          error:
            "Public wheels cannot be reverted to private. You can delete the wheel if you wish to remove it.",
        },
        { status: 409 }
      );
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
