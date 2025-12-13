// app/api/lists/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getServerSession } from "next-auth"; // if using next-auth
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

//used to get all the lists created by the loggedin user
export async function GET(req) {
  await connectMongoDB();

  try {
    // ✅ 1. Get logged-in user
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Fetch all lists for this user
    const lists = await UnifiedList.find({ userId }).lean();

    // ✅ 3. Format response (optional but clean)
    const formatted = lists.map((list) => ({
      id: list._id,
      name: list.name,
      description: list.description,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: list.items.map((item) => ({
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
    }));

    return NextResponse.json({ lists: formatted }, { status: 200 });
  } catch (err) {
    console.error("GET /api/lists error:", err);
    return NextResponse.json(
      { error: "Failed to fetch lists", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  await connectMongoDB();

  try {
    // ✅ 1. Get logged-in user
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Parse request body
    const body = await req.json();
    const { name, description = "" } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    // ✅ 3. Prevent duplicate list names for the same user
    const existing = await UnifiedList.findOne({ userId, name }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "A list with this name already exists" },
        { status: 409 }
      );
    }

    // ✅ 4. Create the list
    const newList = await UnifiedList.create({
      userId,
      name,
      description,
      items: [],
    });

    // ✅ 5. Format response
    const formatted = {
      id: newList._id,
      name: newList.name,
      description: newList.description,
      createdAt: newList.createdAt,
      updatedAt: newList.updatedAt,
      items: [],
    };

    return NextResponse.json({ list: formatted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/lists error:", err);
    return NextResponse.json(
      { error: "Failed to create list", details: err.message },
      { status: 500 }
    );
  }
}
