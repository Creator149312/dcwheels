// app/api/lists/[id]/items/[itemId]/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getServerSession } from "next-auth";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

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

    // Optional: log which one is being removed
    console.log("Removing item", { itemId, item });

    // ✅ 4. Remove item using pull / remove
    item.deleteOne(); // marks it for removal
    // or: list.items.pull({ _id: itemId });

    await list.save();

    return NextResponse.json(
      {
        message: "Item removed",
        list: {
          id: list._id,
          name: list.name,
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
