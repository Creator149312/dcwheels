import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
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
    const { type } = body;

    if (!type || !["word", "entity"].includes(type)) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    // ✅ 3. Fetch list (must belong to user)
    const list = await UnifiedList.findOne({ _id: id, userId });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 4. Build item object
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
      const { entityType, entityId, name, slug, image } = body;

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
    }

    // ✅ 5. Push item and save
    list.items.push(newItem);
    await list.save();

    return NextResponse.json(
      {
        message: "Item added",
        list: {
          id: list._id,
          name: list.name,
          description: list.description,
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
