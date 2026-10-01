// app/api/lists/route.js
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";
import { createImmutableGlobalSlug, getListUrl } from "@utils/UrlHandler";
import { syncListIndexedState } from "@lib/listIndexGate";
import { validateContentSafety, validateListItemsSafety } from "@lib/contentSafety";

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
      // Lightweight fetch — id + name + which entities each list contains.
      // memberEntityIds powers the YouTube-style ✓ indicators in the
      // AddToListButton picker. The projection still avoids shipping full
      // item payloads (images, wordData, etc.) across the wire.
      const lists = await UnifiedList.find({ userId, isDeleted: { $ne: true } })
        .select("_id name isSystem systemKey items.type items.entityId")
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
        systemKey: l.systemKey,
        memberEntityIds: (l.items || [])
          .filter((i) => i.type === "entity" && i.entityId != null)
          .map((i) => String(i.entityId)),
      }));
      return NextResponse.json(
        { lists: formatted },
        { status: 200, headers: { "Cache-Control": "private, max-age=30" } }
      );
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
    const {
      name,
      description = "",
      tags = [],
      isPublic = true,
      format = "standard",
      tierConfig,
      items = [],
      forkedFromListId,
    } = body;

    const VALID_FORMATS = ["standard", "ranked", "tiered"];
    const listFormat = VALID_FORMATS.includes(format) ? format : "standard";

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

    // Tier 1 Content Safety Gate (Write-Time Hard Reject)
    const safetyCheck = validateContentSafety([
      name,
      description,
      ...(Array.isArray(tags) ? tags : []),
    ]);
    if (!safetyCheck.isSafe) {
      return NextResponse.json({ error: safetyCheck.error }, { status: 400 });
    }

    const itemsSafetyCheck = validateListItemsSafety(items);
    if (!itemsSafetyCheck.isSafe) {
      return NextResponse.json({ error: itemsSafetyCheck.error }, { status: 400 });
    }

    // Reserved system list names cannot be used for custom lists
    const RESERVED_NAMES = ["Saved", "Favorites", "My Collection"];
    if (RESERVED_NAMES.map(n => n.toLowerCase()).includes(name.trim().toLowerCase())) {
      return NextResponse.json(
        { error: `"${name.trim()}" is a reserved list name. Please choose a different name.` },
        { status: 409 }
      );
    }

    // Validate and sanitize initial items if provided
    let sanitizedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      if (items.length > 250) {
        return NextResponse.json(
          { error: "Cannot create a list with more than 250 items." },
          { status: 400 }
        );
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== "object") continue;

        if (it.type === "entity") {
          if (!it.entityType || !it.entityId || !it.name || !it.slug) {
            continue; // Skip malformed entity items
          }
          sanitizedItems.push({
            type: "entity",
            entityType: it.entityType,
            entityId: it.entityId,
            name: String(it.name).trim().slice(0, 200),
            slug: String(it.slug).trim(),
            image: it.image || "",
            status: ["want", "in-progress", "done"].includes(it.status) ? it.status : "want",
            tier: it.tier ? String(it.tier).trim() : null,
            rank: typeof it.rank === "number" ? it.rank : (listFormat === "ranked" ? i + 1 : null),
            addedAt: new Date(),
          });
        } else {
          // Default to word item
          const word = (it.word || it.name || it.text || "").trim();
          if (!word) continue;
          sanitizedItems.push({
            type: "word",
            word: word.slice(0, 300),
            wordData: it.wordData || it.image || "",
            tier: it.tier ? String(it.tier).trim() : null,
            rank: typeof it.rank === "number" ? it.rank : (listFormat === "ranked" ? i + 1 : null),
            addedAt: new Date(),
          });
        }
      }
    }

    // ✅ 3. Prevent duplicate list names for the same user
    const existing = await UnifiedList.findOne({ userId, name, isDeleted: { $ne: true } }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "A list with this name already exists" },
        { status: 409 }
      );
    }

    // Only link lineage to a source the user is allowed to see.
    let forkSource = null;
    if (forkedFromListId && mongoose.Types.ObjectId.isValid(forkedFromListId)) {
      const src = await UnifiedList.findOne({
        _id: forkedFromListId,
        isDeleted: { $ne: true },
        isSystem: { $ne: true },
      })
        .select("_id userId isPublic slug")
        .lean();
      if (src && (src.isPublic !== false || String(src.userId) === String(userId))) {
        forkSource = src;
      }
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
      items: sanitizedItems,
      isPublic: typeof isPublic === "boolean" ? isPublic : true,
      slug,
      format: listFormat,
      ...(Array.isArray(tierConfig) && tierConfig.length > 0 ? { tierConfig } : {}),
      ...(forkSource ? { forkedFrom: { listId: forkSource._id, userId: forkSource.userId } } : {}),
    });

    if (forkSource && String(forkSource.userId) !== String(userId)) {
      await UnifiedList.updateOne({ _id: forkSource._id }, { $inc: { forkCount: 1 } });
      revalidateTag(`list-${forkSource._id}`);
      revalidatePath(getListUrl(forkSource));
    }

    // Ensure list index state is evaluated & synced immediately
    await syncListIndexedState(newList._id);

    // ✅ 5. Format response
    const formatted = {
      id: newList._id,
      name: newList.name,
      slug: newList.slug,
      description: newList.description,
      tags: newList.tags,
      createdAt: newList.createdAt,
      updatedAt: newList.updatedAt,
      isPublic: newList.isPublic ?? true,
      isSystem: newList.isSystem ?? false,
      format: newList.format || "standard",
      tierConfig: newList.tierConfig,
      items: newList.items,
    };

    return NextResponse.json(
      { list: formatted, url: getListUrl(formatted) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/lists error:", err);
    return NextResponse.json(
      { error: "Failed to create list", details: err.message },
      { status: 500 }
    );
  }
}
