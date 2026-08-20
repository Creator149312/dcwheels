// app/api/lists/route.js
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";
import { createImmutableGlobalSlug } from "@utils/UrlHandler";

// GET returns the logged-in user's lists, paginated. The route is private
// and session-driven; we keep max-age=0 so mutations are reflected immediately,
// while still allowing the browser to revalidate efficiently.
export async function GET(req) {
  await connectMongoDB();

  try {
    // ✅ 1. Get logged-in user
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slim = searchParams.get("slim") === "1";

    if (slim) {
      // Lightweight fetch — only id + name, no items. Used by AddToListButton
      // picker so it doesn't ship full item arrays across the wire.
      const lists = await UnifiedList.find({ userId, isDeleted: { $ne: true } })
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

    // ✅ 2. Cursor pagination params
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const cursor = searchParams.get("cursor");

    // ✅ 3. Build cursor match for stable pagination
    const baseMatch = { userId, isDeleted: { $ne: true } };
    const sort = { isSystem: -1, updatedAt: -1, _id: -1 };

    let match = baseMatch;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
        const cursorIsSystem = !!decoded.isSystem;
        const cursorUpdatedAt = new Date(decoded.updatedAt);
        const cursorId = new mongoose.Types.ObjectId(decoded._id);

        match = {
          ...baseMatch,
          $or: [
            { isSystem: { $lt: cursorIsSystem } },
            { isSystem: cursorIsSystem, updatedAt: { $lt: cursorUpdatedAt } },
            {
              isSystem: cursorIsSystem,
              updatedAt: cursorUpdatedAt,
              _id: { $lt: cursorId },
            },
          ],
        };
      } catch {
        return NextResponse.json(
          { error: "Invalid cursor" },
          { status: 400 }
        );
      }
    }

    // ✅ 4. Fetch paginated lists for this user
    const lists = await UnifiedList.find(match)
      .sort(sort)
      .limit(limit + 1)
      .lean();

    const hasMore = lists.length > limit;
    const pageLists = hasMore ? lists.slice(0, limit) : lists;

    const formatted = pageLists.map((list) => ({
      id: list._id,
      name: list.name,
      description: list.description,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isSystem: list.isSystem ?? false,
      isPublic: list.isPublic ?? true,
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

    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            isSystem: pageLists[pageLists.length - 1].isSystem,
            updatedAt: pageLists[pageLists.length - 1].updatedAt,
            _id: String(pageLists[pageLists.length - 1]._id),
          })
        ).toString("base64")
      : null;

    return NextResponse.json(
      { lists: formatted, nextCursor, hasMore },
      {
        status: 200,
        headers: {
          // User-specific data: browser may cache, but not shared caches
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      }
    );
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
    const { name, description = "", tags = [], isPublic = true } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    // SEO & UX Validation: Name must contain a reasonable number of alphanumeric characters.
    // Prevents lists named "." or "###" or only emojis/special characters.
    const alphanumericMatch = name.match(/[a-z0-9]/i);
    if (!alphanumericMatch || name.trim().length < 2) {
      return NextResponse.json(
        { error: "List name must be at least 2 characters long and contain alphanumeric characters." },
        { status: 400 }
      );
    }

    if (description && description.length > 300) {
      return NextResponse.json(
        { error: "Description must be 300 characters or less." },
        { status: 400 }
      );
    }

    if (tags && Array.isArray(tags)) {
      const invalidTag = tags.find((t) => typeof t !== "string" || t.length > 30);
      if (invalidTag !== undefined) {
        return NextResponse.json(
          { error: "Each tag must be a string with 30 characters or less." },
          { status: 400 }
        );
      }
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
    const existing = await UnifiedList.findOne({ userId, name, isDeleted: { $ne: true } }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "A list with this name already exists" },
        { status: 409 }
      );
    }

    // ✅ 4. Create the list with a global, transliterated slug
    // The full URL is /lists/[slug]-[id]; because the id is unique, the full
    // URL is guaranteed unique even when multiple lists share the same name.
    const idForSlug = new mongoose.Types.ObjectId().toString();
    const slug = await createImmutableGlobalSlug({ title: name, id: idForSlug });

    const newList = await UnifiedList.create({
      _id: idForSlug,
      userId,
      name,
      description,
      tags: Array.isArray(tags) ? tags : [],
      items: [],
      isPublic: typeof isPublic === "boolean" ? isPublic : true,
      slug,
    });

    // ✅ 5. Format response
    const formatted = {
      id: newList._id,
      name: newList.name,
      description: newList.description,
      tags: newList.tags,
      createdAt: newList.createdAt,
      updatedAt: newList.updatedAt,
      isPublic: newList.isPublic ?? true,
      isSystem: newList.isSystem ?? false,
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
