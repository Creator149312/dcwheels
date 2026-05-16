// app/api/lists/[id]/items/[itemId]/route.js
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getServerSession } from "next-auth";
import { sessionUserId } from "@utils/SessionData";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

/** Returns true only for URLs hosted on Vercel Blob CDN. */
function isBlobUrl(url) {
  return typeof url === "string" && url.includes(".blob.vercel-storage.com");
}

export async function DELETE(req, { params }) {
  await connectMongoDB();

  try {
    const { id, itemId } = params;

    // ✅ 1. Auth check
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Fetch list (must belong to user)
    const list = await UnifiedList.findOne({ _id: id, userId });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 3. Find item by subdocument id
    const item = list.items.id(itemId);
    if (!item) {
      return NextResponse.json(
        { error: "Item not found in this list" },
        { status: 404 }
      );
    }

    // ✅ 4. Capture blob URL before removal
    const blobUrl = item.type === "word" && isBlobUrl(item.wordData) ? item.wordData : null;

    // ✅ 5. Remove item using pull / remove
    item.deleteOne(); // marks it for removal
    // or: list.items.pull({ _id: itemId });

    await list.save();

    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
    revalidateTag(`list-${id}`);

    // ✅ 6. Best-effort blob cleanup
    if (blobUrl) {
      del(blobUrl).catch((e) => console.warn("Blob cleanup failed after item delete:", e));
    }

    return NextResponse.json(
      {
        message: "Item removed",
        list: {
          id: list._id,
          name: list.name,
          userId: list.userId,
          description: list.description,
          items: list.items,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/lists/:id/items/:itemId error:", err);
    return NextResponse.json(
      { error: "Failed to remove item", details: err.message },
      { status: 500 }
    );
  }
}

// PATCH /api/unifiedlist/[id]/items/[itemId]
// Supports two operations depending on the body:
//   { word: "new name" }              — rename a word-type item
//   { status: "want"|"in-progress"|"done" } — update progress status
export async function PATCH(req, { params }) {
  await connectMongoDB();

  try {
    const { id, itemId } = params;

    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const list = await UnifiedList.findOne({ _id: id, userId });
    if (!list) {
      return NextResponse.json({ error: "List not found or access denied" }, { status: 404 });
    }

    const item = list.items.id(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (body.word !== undefined || body.wordData !== undefined) {
      // ── Rename / update image of a word item ──────────────────────────
      if (item.type !== "word") {
        return NextResponse.json({ error: "Only word items can be edited" }, { status: 400 });
      }
      if (body.word !== undefined) {
        const newWord = String(body.word || "").trim();
        if (!newWord) {
          return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
        }
        item.word = newWord;
      }
      if (body.wordData !== undefined) {
        const oldUrl = item.wordData;
        item.wordData = body.wordData;
        // Schedule old blob deletion after save (handled below)
        var replacedBlobUrl = isBlobUrl(oldUrl) && oldUrl !== body.wordData ? oldUrl : null;
      }
    } else if (body.status !== undefined) {
      // ── Update progress status ────────────────────────────────────────
      const VALID = ["want", "in-progress", "done"];
      if (!VALID.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      item.status = body.status;
    } else {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await list.save();

    revalidatePath(`/lists/${id}`);
    revalidateTag(`list-${id}`);

    // Best-effort cleanup of replaced image blob
    if (typeof replacedBlobUrl === "string") {
      del(replacedBlobUrl).catch((e) => console.warn("Blob cleanup failed after image replace:", e));
    }

    return NextResponse.json(
      {
        message: "Item updated",
        list: {
          id: list._id,
          name: list.name,
          userId: list.userId,
          description: list.description,
          items: list.items,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/unifiedlist/:id/items/:itemId error:", err);
    return NextResponse.json({ error: "Failed to update item", details: err.message }, { status: 500 });
  }
}
