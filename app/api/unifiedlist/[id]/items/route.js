import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getListUrl } from "@utils/UrlHandler";
import { getServerSession } from "next-auth";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  await connectMongoDB();

  try {
    const { id } = params;

    // ✅ 1. Auth check
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Parse body
    const body = await req.json();

    // ✅ 2a. Pre-validate payloads
    if (body.items && Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return NextResponse.json({ error: "No items provided" }, { status: 400 });
      }
      if (body.items.length > 250) {
        return NextResponse.json({ error: "Cannot add more than 250 items at once" }, { status: 400 });
      }
      const invalid = body.items.find(
        (item) => item.type !== "word" || !item.word || typeof item.word !== "string" || item.word.trim().length === 0
      );
      if (invalid) {
        return NextResponse.json(
          { error: "Each bulk item must be a non-empty word string" },
          { status: 400 }
        );
      }
    } else {
      const { type } = body;
      if (!type || !["word", "entity"].includes(type)) {
        return NextResponse.json(
          { error: "Invalid item type. Must be 'word' or 'entity'." },
          { status: 400 }
        );
      }
      if (type === "word" && (!body.word || typeof body.word !== "string" || body.word.trim().length === 0)) {
        return NextResponse.json({ error: "word is required for word items" }, { status: 400 });
      }
      if (type === "entity" && (!body.entityType || !body.entityId || !body.name || !body.slug)) {
        return NextResponse.json(
          { error: "entityType, entityId, name, and slug are required for entity items" },
          { status: 400 }
        );
      }
    }

    // ✅ 3. Fetch list (must belong to user)
    const list = await UnifiedList.findOne({ _id: id, userId, isDeleted: { $ne: true } });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 4. Build item object
    // Handle Bulk Add (array of items)
    if (body.items && Array.isArray(body.items)) {
      const newItems = body.items
        .map((item) => {
          if (item.type === "word" && item.word) {
            return {
              type: "word",
              word: item.word,
              wordData: item.wordData || "",
              addedAt: new Date(),
            };
          }
          return null;
        })
        .filter(Boolean); // removes nulls

      if (newItems.length > 0) {
        list.items.push(...newItems);
        await list.save();
      }

      revalidatePath(`/lists/${id}`);
      revalidatePath(getListUrl(list));
      revalidateTag(`list-${id}`);

      return NextResponse.json(
        {
          message: "Items added in bulk",
          list: {
            id: list._id,
            name: list.name,
            userId: list.userId,
            description: list.description,
            format: list.format || "standard",
            tierConfig: list.tierConfig,
            items: list.items,
          },
        },
        { status: 201 }
      );
    }

    // Handle Single Add
    const { type } = body;
    let newItem = { type, addedAt: new Date() };

    if (type === "word") {
      const { word, wordData } = body;

      if (!word) {
        return NextResponse.json(
          { error: "word is required for word items" },
          { status: 400 }
        );
      }

      // Optional: prevent duplicate words
      const exists = list.items.some(
        (i) => i.type === "word" && i.word === word
      );
      if (exists) {
        return NextResponse.json(
          { error: "Word already exists in this list" },
          { status: 409 }
        );
      }

      newItem.word = word;
      newItem.wordData = wordData || "";
    }

    if (type === "entity") {
      const { entityType, entityId, name, slug, image, status } = body;

      if (!entityType || !entityId || !name || !slug) {
        return NextResponse.json(
          { error: "Missing required fields for entity item" },
          { status: 400 }
        );
      }

      // Optional: prevent duplicate entity items
      const exists = list.items.some(
        (i) =>
          i.type === "entity" &&
          i.entityType === entityType &&
          String(i.entityId) === String(entityId)
      );
      if (exists) {
        return NextResponse.json(
          { error: "Entity already exists in this list" },
          { status: 409 }
        );
      }

      newItem.entityType = entityType;
      newItem.entityId = entityId;
      newItem.name = name;
      newItem.slug = slug;
      newItem.image = image || null;
      if (status) newItem.status = status;
    }

    if (body.tier !== undefined) {
      newItem.tier = body.tier ? String(body.tier).trim() : null;
    }
    if (body.rank !== undefined) {
      newItem.rank = typeof body.rank === "number" ? body.rank : null;
    }

    // ✅ 5. Push item and save
    list.items.push(newItem);
    await list.save();

    revalidatePath(`/lists/${id}`);
    revalidatePath(getListUrl(list));
    revalidateTag(`list-${id}`);

    return NextResponse.json(
      {
        message: "Item added",
        list: {
          id: list._id,
          name: list.name,
          userId: list.userId,
          description: list.description,
          format: list.format || "standard",
          tierConfig: list.tierConfig,
          items: list.items,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/lists/:id/items error:", err);
    return NextResponse.json(
      { error: "Failed to add item", details: err.message },
      { status: 500 }
    );
  }
}

// PUT /api/unifiedlist/[id]/items
// Batch update/reorder items (used by TierBoard drag-and-drop and RankedList sorting)
export async function PUT(req, { params }) {
  await connectMongoDB();

  try {
    const { id } = params;

    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const list = await UnifiedList.findOne({ _id: id, userId, isDeleted: { $ne: true } });
    if (!list) {
      return NextResponse.json({ error: "List not found or access denied" }, { status: 404 });
    }

    // Map existing items by string ID
    const itemMap = new Map(list.items.map((it) => [String(it._id), it]));
    const updatedList = [];

    for (const incoming of items) {
      const match = incoming._id ? itemMap.get(String(incoming._id)) : null;
      if (match) {
        if (incoming.tier !== undefined) match.tier = incoming.tier ? String(incoming.tier).trim() : null;
        if (incoming.rank !== undefined) match.rank = typeof incoming.rank === "number" ? incoming.rank : null;
        updatedList.push(match);
      }
    }

    if (updatedList.length === list.items.length) {
      list.items = updatedList;
    }
    await list.save();

    revalidatePath(`/lists/${id}`);
    revalidatePath(getListUrl(list));
    revalidateTag(`list-${id}`);

    return NextResponse.json(
      {
        message: "Items reordered",
        list: {
          id: list._id,
          name: list.name,
          userId: list.userId,
          description: list.description,
          format: list.format || "standard",
          tierConfig: list.tierConfig,
          items: list.items,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PUT /api/lists/:id/items error:", err);
    return NextResponse.json({ error: "Failed to reorder items", details: err.message }, { status: 500 });
  }
}
