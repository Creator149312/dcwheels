// app/api/lists/[id]/route.js
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getListUrl } from "@utils/UrlHandler";
import { getServerSession } from "next-auth";
import { sessionUserId } from "@utils/SessionData";
import { cleanupBlobAssets } from "@lib/blob-cleanup";
import { syncListIndexedState } from "@lib/listIndexGate";
import { validateContentSafety } from "@lib/contentSafety";

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
      .select("_id userId name description tags createdAt updatedAt isPublic isSystem items format tierConfig slug")
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
      format: list.format || "standard",
      tierConfig: list.tierConfig?.length
        ? list.tierConfig
        : [
            { key: "S", label: "S", color: "#EF4444" },
            { key: "A", label: "A", color: "#F97316" },
            { key: "B", label: "B", color: "#EAB308" },
            { key: "C", label: "C", color: "#10B981" },
            { key: "D", label: "D", color: "#3B82F6" },
          ],
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
        tier: item.tier || null,
        rank: item.rank ?? null,
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
    const { name, description, tags, format, tierConfig } = body;

    if (!name && !description && !tags && !format && !tierConfig) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
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

    if (!list.isSystem && description !== undefined && description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less." },
        { status: 400 }
      );
    }

    if (!list.isSystem && description !== undefined) {
      list.description = description;
    }

    if (tags !== undefined && Array.isArray(tags)) {
      list.tags = tags;
    }

    if (format !== undefined) {
      const VALID_FORMATS = ["standard", "ranked", "tiered"];
      if (VALID_FORMATS.includes(format)) {
        list.format = format;
      }
    }

    if (tierConfig !== undefined && Array.isArray(tierConfig)) {
      list.tierConfig = tierConfig;
    }

    await list.save();

    // Re-evaluate quality gate on update (e.g. description lengthened or generic title changed)
    await syncListIndexedState(list._id);

    // Bust ISR cache for this detail page.
    revalidatePath(`/lists/${id}`);
    revalidatePath(getListUrl(list));
    revalidateTag(`list-${id}`);  // bust unstable_cache entry in lib/lists.js
    if (list.slug) {
      revalidateTag(`list-${list.slug}`);
    }
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
          format: list.format || "standard",
          tierConfig: list.tierConfig,
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
    if (list.slug) {
      revalidateTag(`list-${list.slug}`);
    }
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

    // ✅ 2. Parse body — allow isPublic, format, and tierConfig updates
    const body = await req.json();
    const { isPublic, format, tierConfig } = body;

    if (isPublic === undefined && format === undefined && tierConfig === undefined) {
      return NextResponse.json(
        { error: "Must provide isPublic, format, or tierConfig" },
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

    if (isPublic !== undefined) {
      if (typeof isPublic !== "boolean") {
        return NextResponse.json(
          { error: "Invalid isPublic. Must be a boolean." },
          { status: 400 }
        );
      }

      // 🛡️ SEO & Permanence Policy (One-way publish door):
      // Once a list has been published publicly, it cannot be reverted to private.
      // Reverting to private causes Google 404s, index thrashing, and breaks shared links.
      // The creator must delete the list if they want it removed from the platform.
      if (list.isPublic && isPublic === false) {
        return NextResponse.json(
          {
            error:
              "Public lists cannot be reverted to private. You can delete the list if you wish to remove it.",
          },
          { status: 409 }
        );
      }

      list.isPublic = isPublic;
    }

    if (format !== undefined) {
      const VALID_FORMATS = ["standard", "ranked", "tiered"];
      if (!VALID_FORMATS.includes(format)) {
        return NextResponse.json(
          { error: "Invalid format. Must be 'standard', 'ranked', or 'tiered'." },
          { status: 400 }
        );
      }
      list.format = format;
    }

    if (tierConfig !== undefined) {
      if (!Array.isArray(tierConfig) || tierConfig.length === 0) {
        return NextResponse.json(
          { error: "tierConfig must be a non-empty array of tier rows." },
          { status: 400 }
        );
      }
      list.tierConfig = tierConfig;
    }

    await list.save();

    // ✅ 6. Revalidate cache
    revalidatePath(`/lists/${id}`);
    revalidatePath(getListUrl(list));
    revalidateTag(`list-${id}`);
    if (list.slug) {
      revalidateTag(`list-${list.slug}`);
    }
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
      format: list.format || "standard",
      tierConfig: list.tierConfig,
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
        tier: item.tier || null,
        rank: item.rank ?? null,
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
