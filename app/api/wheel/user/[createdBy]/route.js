import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { sessionUser } from "@utils/SessionData";
import mongoose from "mongoose";

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

  // Query indexed by userId
  const query = { userId: new mongoose.Types.ObjectId(userId) };

  const lists = await Wheel.find(query)
    .select("_id title slug description data createdAt wheelPreview tags")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ lists }, { status: 200 });
}
