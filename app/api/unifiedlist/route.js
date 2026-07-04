// app/api/lists/route.js
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

    // ✅ Ensure SYS_SAVED list exists (Lazy Creation)
    // This catches users who registered before this feature or via providers.
    let savedList = await UnifiedList.findOne({ userId, systemKey: "SYS_SAVED" });
    
    if (!savedList) {
      // Fallback: Check if user has a list named "Saved" already but without the key
      // Use regex for case-insensitive match to catch "saved" or "SAVED"
      savedList = await UnifiedList.findOne({ 
        userId, 
        name: { $regex: /^saved$/i } 
      });
      
      if (savedList) {
        // Upgrade legacy list to system list
        savedList.isSystem = true;
        savedList.systemKey = "SYS_SAVED";
        // Standardize the name to "Saved"
        savedList.name = "Saved";
        if (!savedList.description) {
          savedList.description = "Default list for items you've saved.";
        }
        await savedList.save();
      } else {
        // Create brand new system list
        try {
          await UnifiedList.create({
            userId,
            name: "Saved",
            description: "Default list for items you've saved.",
            isSystem: true,
            systemKey: "SYS_SAVED",
            settings: { visibility: "private", sortBy: "recently-saved" },
          });
        } catch (e) {
          if (e.code !== 11000) console.error("Lazy create SYS_SAVED failed:", e);
        }
      }
    }

    const { searchParams } = new URL(req.url);
    const slim = searchParams.get("slim") === "1";

    if (slim) {
      // Lightweight fetch — only id + name, no items. Used by AddToListButton
      // picker so it doesn't ship full item arrays across the wire.
      const lists = await UnifiedList.find({ userId })
        .select("_id name isSystem systemKey")
        .lean();
      
      // Sort system lists to the top, then by name
      const sorted = lists.sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        return a.name.localeCompare(b.name);
      });

      const formatted = sorted.map((l) => ({ 
        id: l._id, 
        name: l.name, 
        isSystem: l.isSystem,
        systemKey: l.systemKey 
      }));
      return NextResponse.json({ lists: formatted }, { status: 200 });
    }

    // ✅ 2. Fetch all lists for this user
    const lists = await UnifiedList.find({ userId }).lean();

    // Sort system lists to the top for the main response as well
    const sortedLists = lists.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return 0;
    });

    // ✅ 3. Format response (optional but clean)
    const formatted = sortedLists.map((list) => ({
      id: list._id,
      name: list.name,
      description: list.description,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isSystem: list.isSystem ?? false,
      settings: {
        sortBy: list.settings?.sortBy || "recently-saved",
        visibility: list.settings?.visibility || "private",
      },
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

    // Reserved system list names cannot be used for custom lists
    const RESERVED_NAMES = ["Saved", "Favorites", "My Collection"];
    if (RESERVED_NAMES.map(n => n.toLowerCase()).includes(name.trim().toLowerCase())) {
      return NextResponse.json(
        { error: `"${name.trim()}" is a reserved list name. Please choose a different name.` },
        { status: 409 }
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

    revalidatePath("/lists");

    return NextResponse.json({ list: formatted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/lists error:", err);
    return NextResponse.json(
      { error: "Failed to create list", details: err.message },
      { status: 500 }
    );
  }
}
