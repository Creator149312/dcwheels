// GET /api/unifiedlist/by-entity?entityId=<id>
// Returns the first matching entity item the authenticated user has saved,
// including which list it lives in and its current status.
// Used by the "On your list" indicator on slug pages.
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");

    if (!entityId || !mongoose.Types.ObjectId.isValid(entityId)) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const entityObjectId = new mongoose.Types.ObjectId(entityId);

    // Find any list belonging to this user that contains this entity item.
    // Project only what the UI needs — avoids sending every item in every list.
    const list = await UnifiedList.findOne(
      { userId, "items.entityId": entityObjectId },
      { name: 1, "items.$": 1 } // positional $ returns only the matched element
    ).lean();

    if (!list || !list.items?.length) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const item = list.items[0];

    return NextResponse.json({
      found: true,
      listId:   String(list._id),
      listName: list.name,
      itemId:   String(item._id),
      status:   item.status || "want",
      addedAt:  item.addedAt,
    });
  } catch (err) {
    console.error("GET /api/unifiedlist/by-entity error:", err);
    return NextResponse.json({ found: false }, { status: 200 }); // fail-safe: never 500 on read
  }
}
