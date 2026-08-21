// app/api/lists/[id]/route.js
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getListUrl } from "@utils/UrlHandler";
import { getServerSession } from "next-auth";
import { sessionUserId } from "@utils/SessionData";
import { cleanupBlobAssets } from "@lib/blob-cleanup";

// GET is public/private depending on list.isPublic. The data itself is
// tag-busted on mutations via revalidateTag, so we don't force dynamic on GET.
// PUT/DELETE remain dynamic because they mutate state.

export async function GET(req, { params }) {
  await connectMongoDB();

  try {
    const { id } = params;

    // Fetch the list first, then gate access:
    // - Owner always allowed
    // - Non-owners allowed only if list.isPublic === true
    const list = await UnifiedList.findOne({ _id: id, isDeleted: { $ne: true } })
      .select("_id userId name description tags createdAt updatedAt isPublic isSystem items")
      .lean();

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    if (!list.isPublic) {
      const requestingUserId = await sessionUserId();
      if (!requestingUserId || String(requestingUserId) !== String(list.userId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // ✅ 3. Format response
    const formatted = {
      id: list._id,
      name: list.name,
      slug: list.slug || "",
      userId: list.userId,
      description: list.description,
      tags: list.tags || [],
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isPublic: list.isPublic ?? true,
      isSystem: list.isSystem ?? false,
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
        status: item.status ?? "want",
        addedAt: item.addedAt,
      })),
    };

    const headers = list.isPublic
      ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
      : { "Cache-Control": "private, no-store" };

    return NextResponse.json({ list: formatted }, { status: 200, headers });
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
    const { name, description, tags } = body;

    if (!name && !description && !tags) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // ✅ 3. Fetch list (must belong to user)
    const list = await UnifiedList.findOne({ _id: id, userId, isDeleted: { $ne: true } });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 4. Protect system lists — name and description cannot be changed by user
    if (list.isSystem) {
      if (name && name !== list.name) {
        return NextResponse.json(
          { error: `The ${list.name} list cannot be renamed` },
          { status: 403 }
        );
      }
      if (description !== undefined && description !== list.description) {
        return NextResponse.json(
          { error: `The description of a system list cannot be modified` },
          { status: 403 }
        );
      }
    }

    // ✅ 5. Prevent duplicate list names or using reserved names
    if (!list.isSystem && name && name !== list.name) {
      if (name.trim().length < 2 || !/[a-z0-9]/i.test(name)) {
        return NextResponse.json(
          { error: "List name must be at least 2 characters long and contain alphanumeric characters." },
          { status: 400 }
        );
      }

      // Block renaming to reserved system names
      const RESERVED_NAMES = ["Saved", "Favorites", "My Collection"];
      if (RESERVED_NAMES.map(n => n.toLowerCase()).includes(name.trim().toLowerCase())) {
        return NextResponse.json(
          { error: `"${name.trim()}" is a reserved list name. Please choose a different name.` },
          { status: 409 }
        );
      }

      const exists = await UnifiedList.findOne({ userId, name, isDeleted: { $ne: true } }).lean();
      if (exists) {
        return NextResponse.json(
          { error: "A list with this name already exists" },
          { status: 409 }
        );
      }
      list.name = name;
    }

    if (!list.isSystem && description !== undefined && description.length > 300) {
      return NextResponse.json(
        { error: "Description must be 300 characters or less." },
        { status: 400 }
      );
    }

    if (!list.isSystem && description !== undefined) {
      list.description = description;
    }

    if (tags !== undefined && Array.isArray(tags)) {
      list.tags = tags;
    }

    await list.save();

    // Bust ISR cache for this detail page.
    revalidatePath(`/lists/${id}`);
    revalidatePath(getListUrl(list));
    revalidateTag(`list-${id}`);  // bust unstable_cache entry in lib/lists.js
    if (list.userId) {
      revalidateTag(`profile-${list.userId}`);
    }

    return NextResponse.json(
      {
        message: "List updated",
        list: {
          id: list._id,
          name: list.name,
          userId: list.userId,
          description: list.description,
          tags: list.tags,
          isPublic: list.isPublic ?? false,
          isSystem: list.isSystem ?? false,
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

    // ✅ 2. Find list first so we can read item images before deleting
    const list = await UnifiedList.findOne({ _id: id, userId, isDeleted: { $ne: true } });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 3. Protect system lists — they cannot be deleted
    if (list.isSystem) {
      return NextResponse.json(
        { error: `The ${list.name} list is a system list and cannot be deleted` },
        { status: 403 }
      );
    }

    // ✅ 4. Collect all Vercel Blob URLs from word items before deletion
    const blobUrls = list.items
      .filter((i) => i.type === "word" && typeof i.wordData === "string" && i.wordData.includes(".blob.vercel-storage.com"))
      .map((i) => i.wordData);

    // ✅ 4. Soft-delete the list
    list.isDeleted = true;
    await list.save();

    revalidatePath(`/lists/${id}`);
    revalidatePath(getListUrl(list));
    revalidateTag(`list-${id}`);
    if (list.userId) {
      revalidateTag(`profile-${list.userId}`);
    }

    // ✅ 5. Best-effort blob cleanup (never blocks the response)
    if (blobUrls.length > 0) {
      cleanupBlobAssets(blobUrls).catch((e) => console.warn("Blob cleanup failed after list delete:", e));
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

export async function PATCH(req, { params }) {
  await connectMongoDB();

  try {
    const { id } = params;

    // ✅ 1. Auth check
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Parse body — allow isPublic toggle only
    const body = await req.json();
    const { isPublic } = body;

    if (isPublic === undefined) {
      return NextResponse.json(
        { error: "Must provide isPublic" },
        { status: 400 }
      );
    }

    if (typeof isPublic !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isPublic. Must be a boolean." },
        { status: 400 }
      );
    }

    // ✅ 3. Find and update list
    const list = await UnifiedList.findOne({ _id: id, userId, isDeleted: { $ne: true } });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    list.isPublic = isPublic;

    await list.save();

    // ✅ 6. Revalidate cache
    revalidatePath(`/lists/${id}`);
    revalidatePath(getListUrl(list));
    revalidateTag(`list-${id}`);
    if (list.userId) {
      revalidateTag(`profile-${list.userId}`);
    }

    // ✅ 4. Format and return full list object
    const formatted = {
      id: list._id,
      name: list.name,
      slug: list.slug || "",
      userId: list.userId,
      description: list.description,
      tags: list.tags || [],
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isPublic: list.isPublic ?? true,
      isSystem: list.isSystem ?? false,
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
        status: item.status ?? "want",
        addedAt: item.addedAt,
      })),
    };

    return NextResponse.json(
      {
        message: "List settings updated",
        list: formatted,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/unifiedlist/:id error:", err);
    return NextResponse.json(
      { error: "Failed to update settings", details: err.message },
      { status: 500 }
    );
  }
}
