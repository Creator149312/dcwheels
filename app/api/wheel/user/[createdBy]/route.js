import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { sessionUser } from "@utils/SessionData";

// Note: A previous PUT handler here referenced an undefined `List` model
// and had no auth — it would have 500'd on first call. Removed entirely
// because nothing in the codebase invokes PUT on this route. Wheel
// updates go through PUT /api/wheel/[id] which enforces ownership.

export async function GET(request) {
  const sessionData = await sessionUser("_id email");
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, user: sessionUserDoc } = sessionData;

  await connectMongoDB();

  // Modern wheels store userId; legacy rows may only have createdBy (email).
  // Include the user's email-matched legacy wheels so the dashboard doesn't
  // appear empty during migration.
  const query = sessionUserDoc?.email
    ? { $or: [{ userId }, { createdBy: sessionUserDoc.email }] }
    : { userId };

  const lists = await Wheel.find(query)
    .select("_id title description data createdAt wheelPreview tags")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ lists }, { status: 200 });
}
