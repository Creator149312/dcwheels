// app/api/lists/[id]/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getServerSession } from "next-auth"; // if using next-auth
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  await connectMongoDB();

  try {
    const { id } = params;

    // ✅ 1. Get logged-in user
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Fetch the list (must belong to this user)
    // const list = await UnifiedList.findOne({ _id: id, userId }).lean(); //slow but secure
    const list = await UnifiedList.findOne({ _id: id }).lean(); //fast but insecure

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 3. Format response
    const formatted = {
      id: list._id,
      name: list.name,
      userId: list.userId,
      description: list.description,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: list.items.map((item) => ({
        _id: item._id,
        type: item.type,
        word: item.word,
        wordData: item.wordData,
        entityType: item.entityType,
        entityId: item.entityId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        addedAt: item.addedAt,
      })),
    };

    return NextResponse.json({ list: formatted }, { status: 200 });
  } catch (err) {
    console.error("GET /api/lists/:id error:", err);
    return NextResponse.json(
      { error: "Failed to fetch list", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
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
    const { name, description } = body;

    if (!name && !description) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // ✅ 3. Fetch list (must belong to user)
    const list = await UnifiedList.findOne({ _id: id, userId });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 4. Prevent duplicate list names
    if (name && name !== list.name) {
      const exists = await UnifiedList.findOne({ userId, name }).lean();
      if (exists) {
        return NextResponse.json(
          { error: "A list with this name already exists" },
          { status: 409 }
        );
      }
      list.name = name;
    }

    if (description !== undefined) {
      list.description = description;
    }

    await list.save();

    return NextResponse.json(
      {
        message: "List updated",
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
    console.error("PUT /api/lists/:id error:", err);
    return NextResponse.json(
      { error: "Failed to update list", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  await connectMongoDB();

  try {
    const { id } = params;

    // ✅ 1. Auth check
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Delete only if list belongs to user
    const deleted = await UnifiedList.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "List deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/lists/:id error:", err);
    return NextResponse.json(
      { error: "Failed to delete list", details: err.message },
      { status: 500 }
    );
  }
}
