import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { validateListDescription, validateListTitle, validateQuizSegments } from "@utils/Validator";
import { NextResponse } from "next/server";
import { sessionUser } from "@utils/SessionData";
import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { cleanupBlobAssets } from "@lib/blob-cleanup";
import { createImmutableGlobalSlug } from "@utils/UrlHandler";
import { syncWheelIndexedState } from "@lib/wheelIndexGate";
import { validateContentSafety, validateWheelSegmentsSafety } from "@lib/contentSafety";
import { calculateDiffRatio } from "@lib/contentDiff";
import TopicPage from "@models/topicpage";
import { normalizeTag } from "@lib/slug";

// Strip base64 images from segment data before persisting to DB.
// Blob URLs (https://...) are kept; data:image/... strings are removed.
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

//sending request to create a list
export async function POST(request) {
  let error = "";
  try {
    // Auth: only logged-in users can create wheels. `createdBy` is derived
    // server-side from the session — we ignore any value the client sent
    // so a malicious request can't impersonate another user.
    const sessionData = await sessionUser("_id name username email");
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, user: sessionUserDoc } = sessionData;
    const authorName = sessionUserDoc.name || "Community";
    const authorHandle = sessionUserDoc.username || null;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid session: missing user id" }, { status: 401 });
    }

    const { title, description, data, wheelData, relatedTopics, tags, type, forkedFromWheelId } =
      await request.json();
    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    if (vlt.length !== 0) error = vlt;
    if (vld.length !== 0) error = vld;

    if (type === "quiz") {
      const quizErr = validateQuizSegments(data);
      if (quizErr) error = quizErr;
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

    const segmentsSafetyCheck = validateWheelSegmentsSafety(data);
    if (!segmentsSafetyCheck.isSafe) {
      return NextResponse.json({ error: segmentsSafetyCheck.error }, { status: 400 });
    }

    if (error.length === 0) {
      await connectMongoDB();

      try {
        const idForSlug = new mongoose.Types.ObjectId().toString();
        const slug = await createImmutableGlobalSlug({ title, id: idForSlug });

        // Lineage & Canonical Fork Filter:
        // If this wheel was created by remixing/editing an existing wheel,
        // compute the originality difference ratio against the parent segments.
        let forkedFromData = undefined;
        let diffRatio = 0;

        if (forkedFromWheelId && mongoose.Types.ObjectId.isValid(forkedFromWheelId)) {
          const parentWheel = await Wheel.findById(forkedFromWheelId)
            .select("_id data authorHandle isPublic")
            .lean();

          if (parentWheel && parentWheel.isPublic !== false) {
            forkedFromData = {
              wheelId: parentWheel._id,
              authorHandle: parentWheel.authorHandle || null,
            };
            diffRatio = calculateDiffRatio(parentWheel.data || [], data || []);
          }
        }

        // Inherit TopicPage canonical slug and top tags when created from a Topic Page (relatedTopics)
        const normalizedWheelTags = Array.isArray(tags)
          ? tags
              .map((t) => (typeof t === "string" ? normalizeTag(t) : t))
              .filter(Boolean)
          : [];

        if (Array.isArray(relatedTopics) && relatedTopics.length > 0) {
          try {
            const firstTopic = relatedTopics[0];
            if (firstTopic?.type && firstTopic?.id) {
              const matchedTopic = await TopicPage.findOne({
                type: firstTopic.type,
                relatedId: firstTopic.id,
              })
                .select("slug tags")
                .lean();

              if (matchedTopic) {
                if (matchedTopic.slug) {
                  const s = normalizeTag(matchedTopic.slug);
                  if (s && !normalizedWheelTags.includes(s)) normalizedWheelTags.push(s);
                }
                if (Array.isArray(matchedTopic.tags)) {
                  for (const t of matchedTopic.tags.slice(0, 4)) {
                    const norm = normalizeTag(t);
                    if (norm && !normalizedWheelTags.includes(norm)) {
                      normalizedWheelTags.push(norm);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Inheriting wheel TopicPage tags failed:", e);
          }
        }

        const creationData = await Wheel.create({
          _id: idForSlug,
          title,
          slug,
          description,
          data: sanitizeSegments(data),
          userId: new mongoose.Types.ObjectId(userId),
          authorName,
          authorHandle,
          wheelData,
          ...(type && ["basic", "quiz"].includes(type) ? { wheelType: type } : {}),
          relatedTopics: Array.isArray(relatedTopics) ? relatedTopics : [],
          ...(forkedFromData ? { forkedFrom: forkedFromData, diffRatio } : {}),
          // Tags are lowercased + trimmed by the schema setter; we still
          // filter out non-strings and empties here as a defensive layer
          // against malformed client payloads.
          tags: normalizedWheelTags,
        });

        // Evaluate and sync wheel indexed state
        await syncWheelIndexedState(creationData._id);

        revalidateTag(`wheel-${creationData._id}`);
        if (userId) {
          revalidateTag(`profile-${userId}`);
        }

        return NextResponse.json({
          message: "Wheel Created Successfully",
          creationID: creationData._id,
          slug: creationData.slug,
        });
      } catch (e) {
        // Duplicate title for the same creator → friendly 409 instead of 500.
        if (e?.code === 11000 || e?.message?.includes("E11000")) {
          return NextResponse.json(
            { error: "You already have a wheel with this title. Please use a different name." },
            { status: 409 }
          );
        }
        throw e;
      }
    } else {
      return NextResponse.json({ error }, { status: 400 });
    }
  } catch (e) {
    console.error("POST /api/wheel failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to create wheel" },
      { status: 500 }
    );
  }
}

//get all the lists
export async function GET() {
  await connectMongoDB();
  const lists = await Wheel.find()
    .select("_id title slug description wheelPreview authorName authorHandle tags isPublic likeCount createdAt updatedAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return NextResponse.json({ lists }, { status: 200 });
}

// to delete a particular Wheel using it's Wheel ID. Only the wheel’s
// creator can delete — enforced via session userId match.
export async function DELETE(request) {
  try {
    const sessionData = await sessionUser("_id email");
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId: sessionUserId } = sessionData;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await connectMongoDB();
    const wheel = await Wheel.findById(id).select("userId wheelPreview data isDeleted").lean();
    if (!wheel) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }

    if (wheel.isDeleted) {
      return NextResponse.json({ message: "Already deleted" }, { status: 410 });
    }

    const wheelUserId = wheel.userId ? String(wheel.userId) : null;

    if (wheelUserId !== String(sessionUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Collect assets to delete
    const assetsToDelete = [];
    
    // 1. Wheel Preview (and its thumbnail)
    if (wheel.wheelPreview) {
      assetsToDelete.push(wheel.wheelPreview);
      if (wheel.wheelPreview.endsWith('.webp')) {
        assetsToDelete.push(wheel.wheelPreview.replace('.webp', '-thumb.webp'));
      }
    }

    // 2. Segment images stored in Vercel Blob
    if (Array.isArray(wheel.data)) {
      wheel.data.forEach(seg => {
        if (seg?.image && typeof seg.image === 'string' && seg.image.includes('.blob.vercel-storage.com')) {
          assetsToDelete.push(seg.image);
        }
      });
    }

    // Soft-delete: update isDeleted = true & isPublic = false
    await Wheel.updateOne({ _id: id }, { $set: { isDeleted: true, isPublic: false } });

    if (wheel.userId) {
      revalidateTag(`profile-${wheel.userId}`);
    }

    // Best-effort cleanup (backgrounded)
    if (assetsToDelete.length > 0) {
      cleanupBlobAssets(assetsToDelete).catch(err => 
        console.error("Delayed cleanup failed for wheel assets:", err)
      );
    }

    return NextResponse.json({ message: "Wheel deleted" }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/wheel failed:", e);
    return NextResponse.json(
      { error: "Failed to delete wheel" },
      { status: 500 }
    );
  }
}
