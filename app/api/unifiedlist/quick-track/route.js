import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { ensureSavedListExists } from "@lib/savedList";
import { getListUrl } from "@utils/UrlHandler";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

// All quick-tracked entities land in the unified "Saved" system list.
const DEFAULT_TARGET_NAME = "Saved";

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
      isDeleted: { $ne: true },
      "items.entityId": { $in: [entityId, String(entityId)] }
    });

    if (foundList) {
      const item = foundList.items.find(
        (i) => String(i.entityId) === String(entityId)
      );
      
      if (item) {
        item.status = status;
        await foundList.save();

        revalidatePath(`/lists/${foundList._id}`);
        revalidatePath(getListUrl(foundList));

        return NextResponse.json({ 
          message: "Status updated", 
          listId: foundList._id, 
          itemId: item._id,
          status: item.status
        }, { status: 200 });
      }
    }

    // 2. Resolve or create the target system list.
    // For all media types we now use the unified "Saved" bucket.
    const targetName = DEFAULT_TARGET_NAME;
    let targetList = await ensureSavedListExists(userId);

    // Migration safety net: if the returned list has old name/description or
    // legacy status values, normalize them before adding the new item.
    let changed = false;
    if (targetList.name !== targetName) {
      targetList.name = targetName;
      changed = true;
    }
    if (targetList.description !== "Default list for items you've saved.") {
      targetList.description = "Default list for items you've saved.";
      changed = true;
    }
    if (targetList.items && Array.isArray(targetList.items)) {
      targetList.items = targetList.items.map((item) => {
        if (item.status === "in-progress") {
          item.status = "done";
          changed = true;
        }
        return item;
      });
    }
    if (changed) await targetList.save();

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

    revalidatePath(`/lists/${targetList._id}`);
    revalidatePath(getListUrl(targetList));
    revalidateTag(`list-${targetList._id}`);

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
