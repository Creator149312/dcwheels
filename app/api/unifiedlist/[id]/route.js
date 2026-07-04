// app/api/lists/[id]/route.js
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

export async function GET(req, { params }) {
  await connectMongoDB();

  try {
    const { id } = params;

    // Fetch the list first, then gate access:
    // - Owner always allowed
    // - Non-owners allowed only if list.isPublic === true
    const list = await UnifiedList.findOne({ _id: id }).lean();

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
      userId: list.userId,
      description: list.description,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isPublic: list.isPublic ?? false,
      isSystem: list.isSystem ?? false,
      settings: {
        sortBy: list.settings?.sortBy || "recently-saved",
        visibility: list.settings?.visibility || "private",
      },
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

    // ✅ 4. Protect system lists — name cannot be changed
    if (list.isSystem && name && name !== list.name) {
      return NextResponse.json(
        { error: `The ${list.name} list cannot be renamed` },
        { status: 403 }
      );
    }

    // ✅ 5. Prevent duplicate list names
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

    // Bust ISR cache for both the index and this detail page.
    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
    revalidateTag(`list-${id}`);  // bust unstable_cache entry in lib/lists.js

    return NextResponse.json(
      {
        message: "List updated",
        list: {
          id: list._id,
          name: list.name,
          userId: list.userId,
          description: list.description,
          settings: {
            sortBy: list.settings?.sortBy || "recently-saved",
            visibility: list.settings?.visibility || "private",
          },
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
    const list = await UnifiedList.findOne({ _id: id, userId });

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
      .filter((i) => i.type === "word" && isBlobUrl(i.wordData))
      .map((i) => i.wordData);

    // ✅ 4. Delete the list
    await list.deleteOne();

    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);

    // ✅ 5. Best-effort blob cleanup (never blocks the response)
    if (blobUrls.length > 0) {
      del(blobUrls).catch((e) => console.warn("Blob cleanup failed after list delete:", e));
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

    // ✅ 2. Parse body — only allow sortBy and visibility updates
    const body = await req.json();
    const { sortBy, visibility } = body;

    if (!sortBy && !visibility) {
      return NextResponse.json(
        { error: "Must provide sortBy or visibility" },
        { status: 400 }
      );
    }

    // ✅ 3. Validate values
    const validSortBy = ["recently-saved", "alphabetical", "status", "entity-type"];
    const validVisibility = ["private", "public"];

    if (sortBy && !validSortBy.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy. Must be one of: ${validSortBy.join(", ")}` },
        { status: 400 }
      );
    }

    if (visibility && !validVisibility.includes(visibility)) {
      return NextResponse.json(
        { error: `Invalid visibility. Must be one of: ${validVisibility.join(", ")}` },
        { status: 400 }
      );
    }

    // ✅ 4. Find and update list
    const list = await UnifiedList.findOne({ _id: id, userId });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // ✅ 5. Update settings
    if (!list.settings) {
      list.settings = {};
    }

    if (sortBy) {
      list.settings.sortBy = sortBy;
    }

    if (visibility) {
      list.settings.visibility = visibility;
      // For backward compatibility, also update isPublic
      list.isPublic = visibility === "public";
    }

    await list.save();

    // ✅ 6. Revalidate cache
    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
    revalidateTag(`list-${id}`);

    // ✅ 7. Format and return full list object
    const formatted = {
      id: list._id,
      name: list.name,
      userId: list.userId,
      description: list.description,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      isPublic: list.isPublic ?? false,
      isSystem: list.isSystem ?? false,
      settings: {
        sortBy: list.settings?.sortBy || "recently-saved",
        visibility: list.settings?.visibility || "private",
      },
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
