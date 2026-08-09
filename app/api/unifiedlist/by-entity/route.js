// GET /api/unifiedlist/by-entity?entityId=<id>
// Returns the first matching entity item the authenticated user has saved,
// including which list it lives in and its current status.
// Used by the "On your list" indicator on slug pages.
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";
import mongoose from "mongoose";

// Private read-only indicator: no need to force dynamic. Response is small
// and user-specific; set a short private cache to reduce repeated calls.
export async function GET(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");

    if (!entityId) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    // Support both ObjectId-stored items (AddToListButton) and
    // string-stored items (QuickSaveButton for external IDs like anime/game).
    const queryIds = [entityId]; // always try string match
    if (mongoose.Types.ObjectId.isValid(entityId)) {
      queryIds.push(new mongoose.Types.ObjectId(entityId));
    }

    const list = await UnifiedList.findOne(
      { userId, isDeleted: { $ne: true }, "items.entityId": { $in: queryIds } },
      { name: 1, "items.$": 1 }
    ).lean();

    if (!list || !list.items?.length) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const item = list.items[0];

    return NextResponse.json(
      {
        found: true,
        listId: String(list._id),
        listName: list.name,
        itemId: String(item._id),
        status: item.status || "want",
        addedAt: item.addedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/unifiedlist/by-entity error:", err);
    return NextResponse.json({ found: false }, { status: 200 }); // fail-safe: never 500 on read
  }
}
