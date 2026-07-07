import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import User from "@models/user";
import { validateListDescription, validateListTitle } from "@utils/Validator";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { cleanupBlobAssets } from "@lib/blob-cleanup";

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const createdBy = session.user.email;
    const authorName = session.user.name;
    const authorHandle = session.user.username;

    const { title, description, data, wheelData, relatedTopics, tags, type } =
      await request.json();
    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    if (vlt.length !== 0) error = vlt;
    if (vld.length !== 0) error = vld;

    if (error.length === 0) {
      await connectMongoDB();
      
      // Get userId from session (mongoId is set during auth callback)
      let userId = null;
      if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
        userId = new mongoose.Types.ObjectId(session.user.id);
      } else if (createdBy) {
        // Fallback: lookup user by email
        const user = await User.findOne({ email: createdBy }).select("_id").lean();
        if (user) userId = user._id;
      }
      
      const creationData = await Wheel.create({
        title,
        description,
        data: sanitizeSegments(data),
        createdBy,
        ...(userId ? { userId } : {}),
        authorName,
        authorHandle,
        wheelData,
        ...(type && ["basic", "quiz"].includes(type) ? { wheelType: type } : {}),
        relatedTopics: Array.isArray(relatedTopics) ? relatedTopics : [],
        // Tags are lowercased + trimmed by the schema setter; we still
        // filter out non-strings and empties here as a defensive layer
        // against malformed client payloads.
        tags: Array.isArray(tags)
          ? tags.filter((t) => typeof t === "string" && t.trim().length > 0)
          : [],
      });
      return NextResponse.json({
        message: "Wheel Created Successfully",
        creationID: creationData._id,
      });
    } else {
      return NextResponse.json({ error });
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
  const lists = await Wheel.find();
  return NextResponse.json({ lists }, { status: 200 });
}

//   //get all the lists created by a user
// export async function GET(request) {
//   const {createdBy} =  await request.json();
//   console.log("CreatedBy = " + request);
//   await connectMongoDB();
//   const lists = await List.find({ createdBy: createdBy });
//   return NextResponse.json({ lists }, {status: 200});
// }

// to delete a particular Wheel using it's Wheel ID. Only the wheel’s
// creator can delete — enforced via session email match against
// `createdBy` so other users (and anonymous callers) get a 403.
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await connectMongoDB();
    const wheel = await Wheel.findById(id).select("createdBy wheelPreview data").lean();
    if (!wheel) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }
    if (wheel.createdBy !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Collect assets to delete
    const assetsToDelete = [];
    
    // 1. Wheel Preview (and its thumbnail)
    if (wheel.wheelPreview) {
      assetsToDelete.push(wheel.wheelPreview);
      // If it's a .webp, we also generated a -thumb.webp
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

    await Wheel.findByIdAndDelete(id);

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
