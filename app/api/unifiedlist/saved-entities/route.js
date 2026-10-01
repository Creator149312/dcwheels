// GET /api/unifiedlist/saved-entities
// One batch lookup: returns ALL of the authenticated user's lists (including
// empty ones) with their entity items. This single payload powers both the
// global saved-state cache (QuickSaveButton) and the AddToListButton picker,
// so neither needs a separate request after the session-scoped boot fetch.
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

// Defensive payload cap: system lists allow 2,000 items each and a user can
// own many lists, so an extreme account could otherwise balloon the boot fetch.
// 5,000 covers every realistic library while bounding memory + transfer.
// Newest-first ordering keeps the most relevant entries when the cap hits.
const MAX_SAVED_ENTITIES = 5000;

export async function GET() {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ lists: [] }, { status: 200 });
    }

    const lists = await UnifiedList.find(
      { userId, isDeleted: { $ne: true } },
      { name: 1, isSystem: 1, systemKey: 1, items: 1 }
    ).lean();

    // System lists first, then alphabetical (matches the picker's ordering)
    lists.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return a.name.localeCompare(b.name);
    });

    // Flatten entity items for the defensive cap (newest first)
    const allItems = [];
    for (const l of lists) {
      for (const i of l.items || []) {
        if (i.type !== "entity" || i.entityId == null) continue;
        allItems.push({
          itemId: String(i._id),
          addedAt: i.addedAt ? new Date(i.addedAt).getTime() : 0,
        });
      }
    }
    allItems.sort((a, b) => b.addedAt - a.addedAt);
    const keptIds = new Set(allItems.slice(0, MAX_SAVED_ENTITIES).map((x) => x.itemId));

    const payloadLists = lists.map((l) => ({
      id: String(l._id),
      name: l.name,
      isSystem: !!l.isSystem,
      systemKey: l.systemKey || null,
      items: (l.items || [])
        .filter((i) => i.type === "entity" && i.entityId != null && keptIds.has(String(i._id)))
        .map((i) => ({ entityId: String(i.entityId), itemId: String(i._id) })),
    }));

    return NextResponse.json(
      { lists: payloadLists },
      {
        status: 200,
        headers: {
          // Private per-user data; short cache shields against rapid remounts
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/unifiedlist/saved-entities error:", err);
    return NextResponse.json({ lists: [] }, { status: 200 });
  }
}
