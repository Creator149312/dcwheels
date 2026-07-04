import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

// Configuration for system-managed lists. 
// We use a unified "Saved" model (like Facebook, Instagram, Threads)
// that works for all entity types (media + wheels).
const SYSTEM_LIST_CONFIG = {
  // All content types go to unified "Saved" bucket
  movie:     { key: "SYS_SAVED", name: "Saved" },
  tv:        { key: "SYS_SAVED", name: "Saved" },
  anime:     { key: "SYS_SAVED", name: "Saved" },
  game:      { key: "SYS_SAVED", name: "Saved" },
  character: { key: "SYS_SAVED", name: "Saved" },
  wheel:     { key: "SYS_SAVED", name: "Saved" },
  uwheel:    { key: "SYS_SAVED", name: "Saved" },
};

const getDefaultInfo = (entityType) => {
  return SYSTEM_LIST_CONFIG[entityType] || { key: "SYS_COLLECTION", name: "My Collection" };
};

export async function POST(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, name, slug, image, status = "want" } = body;

    if (!entityType || !entityId || !name || !slug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Efficient lookup: Check if user already has this entity in ANY of their lists.
    // The multi-key index on { userId, "items.entityId" } makes this O(1).
    const foundList = await UnifiedList.findOne({
      userId,
      "items.entityId": { $in: [entityId, String(entityId)] }
    });

    if (foundList) {
      const item = foundList.items.find(
        (i) => String(i.entityId) === String(entityId)
      );
      
      if (item) {
        item.status = status;
        await foundList.save();

        revalidatePath("/lists");
        revalidatePath(`/lists/${foundList._id}`);

        return NextResponse.json({ 
          message: "Status updated", 
          listId: foundList._id, 
          itemId: item._id,
          status: item.status
        }, { status: 200 });
      }
    }

    // 2. Resolve or Create the appropriate target list.
    const { key: targetKey, name: targetName } = getDefaultInfo(entityType);
    
    // Tiered lookup for robustness:
    // a) Search by systemKey (New optimized way)
    // b) Search by legacy name (Backward compatibility for "Favorites" → "Saved")
    let targetList = await UnifiedList.findOne({
      userId,
      $or: [
        { systemKey: targetKey },
        // LEGACY: If no systemKey, check for old "Favorites" or old list names
        { name: targetName },
        { name: "Favorites" },  // ← production "Favorites" lists get migrated here
      ]
    });

    if (!targetList) {
      targetList = new UnifiedList({
        userId,
        name: targetName,
        systemKey: targetKey,
        isSystem: true,
        description: `Your saved ${entityType}s.`,
        isPublic: false,
      });
    } else if (!targetList.systemKey) {
      // Automatic Migration: Found a legacy list by name but it lacks system metadata.
      // Update it with new systemKey and display name.
      targetList.systemKey = targetKey;
      targetList.isSystem = true;
      targetList.name = targetName;  // ← Rename "Favorites" → "Saved"
      
      // MIGRATION: Map old "in-progress" status → "done"
      // (Reasonable assumption: if user had it in-progress, treat as done now)
      if (targetList.items && Array.isArray(targetList.items)) {
        targetList.items = targetList.items.map(item => {
          if (item.status === "in-progress") {
            item.status = "done";
          }
          return item;
        });
      }
    }

    // 3. Add item and save. 
    // We don't worry about duplicates here because the initial check above caught them.
    const newItem = {
      type: "entity",
      entityType,
      entityId,
      name,
      slug,
      image: image || null,
      status,
      addedAt: new Date(),
    };

    targetList.items.push(newItem);
    await targetList.save();

    revalidatePath("/lists");
    revalidatePath(`/lists/${targetList._id}`);

    const savedItem = targetList.items[targetList.items.length - 1];

    return NextResponse.json({ 
      message: "Item tracked", 
      listId: targetList._id, 
      itemId: savedItem._id,
      status: savedItem.status
    }, { status: 201 });

  } catch (err) {
    console.error("POST /api/unifiedlist/quick-track error:", err);
    return NextResponse.json(
      { error: "Failed to quick-track item", details: err.message },
      { status: 500 }
    );
  }
}
