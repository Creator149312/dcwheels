import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { validateListDescription, validateListTitle } from "@utils/Validator";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

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

    const { title, description, data, wheelData, relatedTopics, tags } =
      await request.json();
    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    if (vlt.length !== 0) error = vlt;
    if (vld.length !== 0) error = vld;

    if (error.length === 0) {
      // console.log("Inside Processing and Trying to Create Wheel");
      await connectMongoDB();
      const creationData = await Wheel.create({
        title,
        description,
        data: sanitizeSegments(data),
        createdBy,
        wheelData,
        relatedTopics: Array.isArray(relatedTopics) ? relatedTopics : [],
        // Tags are lowercased + trimmed by the schema setter; we still
        // filter out non-strings and empties here as a defensive layer
        // against malformed client payloads.
        tags: Array.isArray(tags)
          ? tags.filter((t) => typeof t === "string" && t.trim().length > 0)
          : [],
      });
      // console.log("Creation Data", creationData);
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
    const wheel = await Wheel.findById(id).select("createdBy").lean();
    if (!wheel) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }
    if (wheel.createdBy !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Wheel.findByIdAndDelete(id);
    return NextResponse.json({ message: "Wheel deleted" }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/wheel failed:", e);
    return NextResponse.json(
      { error: "Failed to delete wheel" },
      { status: 500 }
    );
  }
}
