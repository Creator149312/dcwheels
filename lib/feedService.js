import { connectMongoDB } from "@/lib/mongodb";
import Post from "@/models/post";
import Wheel from "@/models/wheel";
import User from "@/models/user";
import UnifiedList from "@/models/unifiedlist";
import mongoose from "mongoose";

/**
 * Shared mapping function for aggregated items
 */
async function mapFeedResults(items, users, creatorsByEmail) {
  const nameById = new Map(users.map((u) => [String(u._id), u.name || "Community"]));
  const handleById = new Map(users.map((u) => [String(u._id), u.username || null]));
  const nameByEmail = new Map(creatorsByEmail.map((u) => [u.email, u.name || "Community"]));
  const handleByEmail = new Map(creatorsByEmail.map((u) => [u.email, u.username || null]));

  return items.map((r) => {
    const docType = r._docType || "post";
    const fallbackHotScore = Math.floor(
      (r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt || Date.now()).getTime()) / 1000
    );
    const base = {
      id: String(r._id),
      _id: String(r._id),
      docType,
      title: r.title || r.name || null,
      hasTruncation: r.hasTruncation || false,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      hotScore: Number(r.hotScore) || fallbackHotScore,
      tags: r.tags || [],
      ...(r._feedStage ? { _feedStage: r._feedStage } : {}),
    };

    if (docType === "post") {
      return {
        ...base,
        userId: r.userId ? String(r.userId) : null,
        content: r.content || "",
        authorName: r.authorName || nameById.get(String(r.userId)) || "Community",
        authorHandle: r.authorHandle || handleById.get(String(r.userId)) || null,
        authorImage: r.authorImage || null,
        hasPoll: r.hasPoll || false,
        pollOptions: (r.pollOptions || []).map((o) => ({
          _id: String(o._id),
          text: o.text,
          image: o.image || null,
          imageVariants: o.imageVariants
            ? {
                sm: o.imageVariants.sm || null,
                md: o.imageVariants.md || null,
              }
            : null,
          voteCount: o.voteCount || 0,
        })),
        likeCount: r.likeCount || 0,
        commentCount: r.commentCount || 0,
        image: r.image || null,
        imageVariants: r.imageVariants
          ? {
              sm: r.imageVariants.sm || null,
              md: r.imageVariants.md || null,
              lg: r.imageVariants.lg || null,
            }
          : null,
        contentRef: r.contentRef || null,
        entities: Array.isArray(r.entities) && r.entities.length > 0 ? r.entities : (r.contentRef ? [r.contentRef] : []),
        ogMeta: r.ogMeta || null,
        category: r.category || null,
        isPublic: r.isPublic ?? true,
      };
    } else if (docType === "wheel") {
      // wheel
      let authorDisplayName = r.authorName || r.createdBy || "Community";
      let authorHandle = r.authorHandle || null;

      if (authorDisplayName && authorDisplayName.includes("@")) {
        const creatorEmail = authorDisplayName;
        authorDisplayName = nameByEmail.get(creatorEmail) || nameById.get(String(r.userId)) || "Community";
        authorHandle = authorHandle || handleByEmail.get(creatorEmail) || handleById.get(String(r.userId)) || null;
      } else if (!authorHandle && r.userId) {
        authorDisplayName = authorDisplayName || nameById.get(String(r.userId));
        authorHandle = handleById.get(String(r.userId));
      }

      return {
        ...base,
        description: r.description || r.content || "",
        authorName: authorDisplayName,
        authorHandle: authorHandle,
        authorImage: r.authorProfileImage || r.authorImage || null,
        wheelPreview: r.wheelPreview || null,
        likeCount: r.likeCount || 0,
        isPublic: r.isPublic ?? true,
        slug: r.slug || null, // Pass through the slug for clean URLs in the feed
      };
    } else {
      // list
      return {
        ...base,
        name: r.name || r.title || "Untitled List", // List name is stored in "name" field
        title: r.name || r.title || "Untitled List",
        userId: String(r.userId),
        authorName: nameById.get(String(r.userId)) || "Community",
        authorHandle: handleById.get(String(r.userId)) || null,
        description: r.description || "",
        items: (r.items || []).map(item => ({
          ...item,
          _id: item._id ? String(item._id) : Math.random().toString(36).substring(7)
        })),
        likeCount: r.likeCount || 0,
        commentCount: r.commentCount || 0,
        isPublic: true,
        slug: r.slug || null,
        format: r.format || "standard",
      };
    }
  });
}

/**
 * Decode a feed cursor string into { hotScore, createdAt, _id, listOffset, stage }.
 * Supports both hotScore cursors ("1715000000|_id|listOffset") and legacy ISO cursors ("2026-04-12T...|_id|listOffset").
 * Stage Cursor format: "cat|1715000000|_id|listOffset"
 */
function decodeFeedCursor(cursor) {
  if (!cursor || typeof cursor !== "string" || !cursor.includes("|")) return null;
  const parts = cursor.split("|");
  let stage = null;
  let cursorVal;
  let cursorId;
  let listOffsetStr;

  if (parts[0] === "cat") {
    stage = "cat";
    cursorVal = parts[1];
    cursorId = parts[2];
    listOffsetStr = parts[3];
  } else {
    cursorVal = parts[0];
    cursorId = parts[1];
    listOffsetStr = parts[2];
  }

  if (!cursorVal || !cursorId || !mongoose.Types.ObjectId.isValid(cursorId)) return null;
  const parsedListOffset = listOffsetStr ? parseInt(listOffsetStr, 10) : 0;

  let hotScore = null;
  let createdAt = null;
  if (/^\d+$/.test(cursorVal)) {
    hotScore = Number(cursorVal);
    createdAt = new Date(hotScore * 1000);
  } else {
    createdAt = new Date(cursorVal);
    if (!Number.isNaN(createdAt.getTime())) {
      hotScore = Math.floor(createdAt.getTime() / 1000);
    }
  }

  if (!hotScore || Number.isNaN(hotScore)) return null;

  return {
    stage,
    hotScore,
    createdAt,
    _id: new mongoose.Types.ObjectId(cursorId),
    listOffset: Number.isNaN(parsedListOffset) ? 0 : parsedListOffset,
  };
}

/**
 * Merge two sorted arrays into one descending-by-hotScore (or createdAt) stream.
 */
function mergeByHotScore(left, right) {
  const result = [];
  let i = 0;
  let j = 0;

  const getScore = (doc) => {
    if (typeof doc.hotScore === "number" && !Number.isNaN(doc.hotScore)) return doc.hotScore;
    const d = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
    return Math.floor(d.getTime() / 1000);
  };

  const compare = (a, b) => {
    const aScore = getScore(a);
    const bScore = getScore(b);
    if (aScore !== bScore) return bScore - aScore;
    const aId = String(a._id);
    const bId = String(b._id);
    return aId > bId ? -1 : aId < bId ? 1 : 0;
  };

  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  while (i < left.length) result.push(left[i++]);
  while (j < right.length) result.push(right[j++]);

  return result;
}

/**
 *Interleave Posts and Wheels using a 60/25 quota ratio (~70% Posts, ~30% Wheels before List injection)
 * so active Wheels always appear in every batch instead of being drowned out by new Posts.
 * Within each stream, items are already sorted by hotScore descending.
 */
function interleavePostsAndWheels(posts, wheels, limit) {
  if (!wheels || wheels.length === 0) return (posts || []).slice(0, limit);
  if (!posts || posts.length === 0) return (wheels || []).slice(0, limit);

  const targetWheels = Math.max(1, Math.round(limit * 0.28)); // ~2 wheels per 8-item page (25% of 8)
  const targetPosts = Math.max(1, limit - targetWheels);

  const selectedWheels = wheels.slice(0, targetWheels);
  const selectedPosts = posts.slice(0, targetPosts);

  // Backfill if either stream had fewer items than its quota
  if (selectedWheels.length < targetWheels) {
    const extraNeeded = targetWheels - selectedWheels.length;
    selectedPosts.push(...posts.slice(targetPosts, targetPosts + extraNeeded));
  } else if (selectedPosts.length < targetPosts) {
    const extraNeeded = targetPosts - selectedPosts.length;
    selectedWheels.push(...wheels.slice(targetWheels, targetWheels + extraNeeded));
  }

  // Rhythmically interleave: place a Wheel roughly every 3rd slot (index 2, 5, 8...)
  // while preserving relative hotScore ordering within Posts and within Wheels.
  const combined = [];
  let pIdx = 0;
  let wIdx = 0;

  while (combined.length < limit && (pIdx < selectedPosts.length || wIdx < selectedWheels.length)) {
    // Insert 2 posts, then 1 wheel
    for (let step = 0; step < 2 && pIdx < selectedPosts.length && combined.length < limit; step++) {
      combined.push(selectedPosts[pIdx++]);
    }
    if (wIdx < selectedWheels.length && combined.length < limit) {
      combined.push(selectedWheels[wIdx++]);
    }
  }

  return combined;
}

/**
 * Build a cursor-tied match clause for stable pagination.
 * Uses hotScore for discovery feeds, or createdAt for personal profile feeds.
 */
function buildCursorMatch(cursor, useCreatedAt = false) {
  const decoded = decodeFeedCursor(cursor);
  if (!decoded) return null;
  if (useCreatedAt) {
    return {
      $or: [
        { createdAt: { $lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, _id: { $lte: decoded._id } },
      ],
    };
  }
  return {
    $or: [
      { hotScore: { $lt: decoded.hotScore } },
      { hotScore: decoded.hotScore, _id: { $lte: decoded._id } },
    ],
  };
}

/**
 * Unified feed fetcher for Global, Topic, Tag, and User Profile pages.
 *
 * TODO: Centralize pagination. Callers currently duplicate the limit+1 / slice /
 * nextCursor dance in ~7 places. Refactor this function to return
 * { items, nextCursor, hasMore } so consumers only pass `limit`.
 */
export async function getFeedItems({ 
  type, 
  externalId, 
  tag, 
  userId, 
  docType: requestedDocType, 
  limit = 8, 
  cursor = null,
  showPrivate = false
}) {
  await connectMongoDB();

  // Normalize type: "global" is a virtual feed type representing the general feed
  const effectiveType = type === "global" ? null : type;

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 8));
  const postMatch = { isDeleted: false };
  const wheelMatch = { isDeleted: { $ne: true } };
  const listMatch = { isSystem: { $ne: true }, isDeleted: { $ne: true } }; // Don't show "My Library" etc in feed

  // For Global Feed Discovery: High-quality filtering (Entities only, min items)
  const isGlobalFeed = !userId && !tag && !effectiveType && !externalId;

  if (!showPrivate) {
    postMatch.isPublic = true;
    postMatch.shadowBanned = false;
    wheelMatch.isPublic = true;
    listMatch.isPublic = { $ne: false };  // public unless explicitly private

    // TIER 3 QUALITY GATES FOR DISCOVERY FEEDS:
    // When browsing public discovery feeds (not a personal profile user query):
    // 1. Wheels: Must have at least 4 segments (excludes broken drafts and 1-2 slice trivial tests)
    // 2. Lists: Must have at least 5 items and be Entity lists for discovery value
    // 3. Posts: Substantive content (length >= 15 chars, poll, or image)
    if (!userId) {
      wheelMatch["data.3"] = { $exists: true };
      postMatch.$or = [
        { content: { $regex: /^.{15,}/s } },
        { hasPoll: true },
        { image: { $exists: true, $ne: null } },
      ];
    }

    listMatch["items.4"] = { $exists: true }; 
    listMatch["items.type"] = "entity";

    if (isGlobalFeed) {
      // Additional global-only filters can go here if needed in the future
    }
  }
  
  const useCreatedAtSort = Boolean(userId);
  const sortCriterion = useCreatedAtSort
    ? { createdAt: -1, _id: -1 }
    : { hotScore: -1, _id: -1 };
  const cursorMatch = buildCursorMatch(cursor, useCreatedAtSort);

  // Cascading Topic Page Feed: When querying a specific topic (effectiveType && externalId),
  // if topic-specific posts/wheels are exhausted or fewer than safeLimit, we gracefully
  // cascade into the broader category hub feed (e.g. general /anime content for /anime/[slug]),
  // excluding the current externalId to avoid duplicates.
  const isCascadingTopicFeed = Boolean(effectiveType && externalId && !userId && !tag);
  const decodedCursor = decodeFeedCursor(cursor);
  const isCategoryStageCursor = isCascadingTopicFeed && decodedCursor?.stage === "cat";

  const categoryTagAliases = {
    movie: ["movie", "movies", "film", "films", "cinema"],
    anime: ["anime", "manga", "animanga"],
    game: ["game", "games", "gaming", "videogame", "videogames"],
    character: ["character", "characters"],
  };

  const idAsString = externalId ? String(externalId) : null;
  const idAsNumber = externalId ? Number(externalId) : null;
  const idMatcher = externalId
    ? (Number.isNaN(idAsNumber) ? idAsString : { $in: [idAsString, idAsNumber] })
    : null;

  if (userId) {
    const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    postMatch.userId = uid;
    wheelMatch.userId = uid;
    listMatch.userId = uid;
  } else if (isCascadingTopicFeed && isCategoryStageCursor) {
    // Stage 2: Topic items were previously exhausted. Cursor points directly into category fallback.
    const matchedTags = categoryTagAliases[effectiveType] || [effectiveType];
    postMatch.$or = [
      { "contentRef.type": effectiveType },
      { "entities.type": effectiveType },
      { tags: { $in: matchedTags } },
    ];
    postMatch["contentRef.externalId"] = { $ne: idAsString };
    postMatch["entities.externalId"] = { $ne: idAsString };

    wheelMatch.$or = [
      { "relatedTopics.type": effectiveType },
      { tags: { $in: matchedTags } },
    ];
    wheelMatch["relatedTopics.id"] = { $ne: idAsString };
    listMatch.$or = [
      { "items.entityType": effectiveType },
      { tags: { $in: matchedTags } },
    ];
  } else {
    // For global feed, lists don't really have tags or contentRef easily indexed for now
    // If tag is present, we might skip lists or filter them if possible
    if (effectiveType && externalId) {
      // Topic/entity feeds: externalId may be stored as a number or string
      // depending on the seed route. Query both forms for robustness.
      postMatch.$or = [
        { "contentRef.externalId": idMatcher, "contentRef.type": effectiveType },
        { "entities.externalId": idMatcher, "entities.type": effectiveType },
      ];
      wheelMatch["relatedTopics"] = { $elemMatch: { type: effectiveType, id: idMatcher } };
      // Lists could potentially have related topics, but for now we'll skip them or filter by items
      listMatch["items.entityId"] = idMatcher;
    } else if (effectiveType && !externalId) {
      // Category hub feed (e.g. /movie, /anime, /game, /character)
      // Match content referencing this category OR tagged with this category/aliases
      const matchedTags = categoryTagAliases[effectiveType] || [effectiveType];

      postMatch.$or = [
        { "contentRef.type": effectiveType },
        { "entities.type": effectiveType },
        { tags: { $in: matchedTags } },
      ];

      wheelMatch.$or = [
        { "relatedTopics.type": effectiveType },
        { tags: { $in: matchedTags } },
      ];

      listMatch.$or = [
        { "items.entityType": effectiveType },
        { tags: { $in: matchedTags } },
      ];
    } else if (tag) {
      // Tags are normalized to lowercase/hyphens on save, but incoming tag
      // slugs may differ slightly. Normalize and support comma-separated lists.
      const normalizeTag = (t) =>
        String(t)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .replace(/^-+|-+$/g, "");

      const rawTags = tag.includes(",")
        ? tag.split(",").map((t) => t.trim()).filter(Boolean)
        : [tag];
      const normalizedTags = [...new Set(rawTags.map(normalizeTag).filter(Boolean))];

      postMatch.tags = normalizedTags.length > 1 ? { $in: normalizedTags } : normalizedTags[0];
      wheelMatch.tags = normalizedTags.length > 1 ? { $in: normalizedTags } : normalizedTags[0];
      listMatch.tags = normalizedTags.length > 1 ? { $in: normalizedTags } : normalizedTags[0];
    }
  }

  // Safely merge cursor constraints without overwriting existing $or filters (e.g. category matching)
  if (cursorMatch) {
    if (postMatch.$or) {
      postMatch.$and = [{ $or: postMatch.$or }, cursorMatch];
      delete postMatch.$or;
    } else {
      Object.assign(postMatch, cursorMatch);
    }

    if (wheelMatch.$or) {
      wheelMatch.$and = [{ $or: wheelMatch.$or }, cursorMatch];
      delete wheelMatch.$or;
    } else {
      Object.assign(wheelMatch, cursorMatch);
    }

    if (requestedDocType === "list") {
      if (listMatch.$or) {
        listMatch.$and = [{ $or: listMatch.$or }, cursorMatch];
        delete listMatch.$or;
      } else {
        Object.assign(listMatch, cursorMatch);
      }
    }
  }

  const includePosts = !requestedDocType || requestedDocType.includes("post");
  const includeWheels = !requestedDocType || requestedDocType.includes("wheel");
  // INDUSTRY STANDARD: On specific context pages (Topic/Tag), we default to Primary Content only.
  // Lists are "Organizational" content and are best discovered on Home/Global and Category Hub feeds.
  const isContextualPage = Boolean(tag || (effectiveType && externalId));
  const includeLists = requestedDocType 
    ? requestedDocType.includes("list") 
    : (isContextualPage ? false : true);

  // NOTE: Projections are intentionally inlined in the .select() calls below.
  // Keeping them close to the queries makes index coverage obvious and avoids
  // stale $project objects when the feed mapper changes.

  // ── DEDICATED LIST FEED ──────────────────────────────────────────────────
  // /lists page requests a paginated stream of lists only. Skip the mixed
  // feed merge and author backfill runs the same path as other doc types.
  if (requestedDocType === "list") {
    const listDocs = await UnifiedList.find(listMatch)
      .sort(sortCriterion)
      .limit(safeLimit)
      .select({ name: 1, description: 1, userId: 1, createdAt: 1, hotScore: 1, likeCount: 1, commentCount: 1, items: { $slice: 10 }, slug: 1, isPublic: 1, format: 1 })
      .lean();

    const typedLists = (listDocs || []).map((r) => ({
      ...r,
      _id: r._id.toString(),
      _docType: "list",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));

    const listUserIds = [...new Set(typedLists.filter((r) => r.userId).map((r) => String(r.userId)))];
    const users = listUserIds.length
      ? await User.find({ _id: { $in: listUserIds } }).select("name username").lean()
      : [];

    return mapFeedResults(typedLists, users, []);
  }

  // ── SCALABLE FEED ASSEMBLY (60/25/15 QUOTA + HOTSCORE) ───────────────────
  // Instead of a single $unionWith aggregation that sorts in-memory, we run
  // indexed queries per collection in parallel and interleave the results.
  let items = [];

  const fetchPosts = includePosts
    ? Post.find(postMatch)
        .sort(sortCriterion)
        .limit(safeLimit)
        .select("_id userId content hasTruncation image imageVariants tags contentRef entities hasPoll pollOptions likeCount commentCount createdAt hotScore authorName authorHandle authorImage ogMeta isPublic")
        .lean()
    : Promise.resolve([]);

  const fetchWheels = includeWheels
    ? Wheel.find(wheelMatch)
        .sort(sortCriterion)
        .limit(safeLimit)
        .select("_id title description content createdBy authorName authorHandle authorProfileImage createdAt hotScore wheelPreview tags likeCount commentCount isPublic slug")
        .lean()
    : Promise.resolve([]);

  const [postDocs, wheelDocs] = await Promise.all([fetchPosts, fetchWheels]);

  const typedPosts = (postDocs || []).map((r) => ({ ...r, _docType: "post" }));
  const typedWheels = (wheelDocs || []).map((r) => ({ ...r, _docType: "wheel", content: r.description }));

  // When both Posts and Wheels are requested in a discovery feed, use the 60/25
  // quota interleaver so active Wheels are guaranteed representation in every batch.
  if (includePosts && includeWheels && !userId) {
    items = interleavePostsAndWheels(typedPosts, typedWheels, safeLimit);
  } else {
    items = mergeByHotScore(typedPosts, typedWheels).slice(0, safeLimit);
  }

  // ── CASCADING BACKFILL FOR TOPIC PAGES ──────────────────────────────────
  // If this is a topic page (Stage 1) and topic-specific items are fewer than safeLimit,
  // backfill the remaining slots from the general category feed so users never hit an empty feed.
  // Items from fallback are tagged with _feedStage: "cat" so nextCursor can transition smoothly.
  if (isCascadingTopicFeed && !isCategoryStageCursor && items.length < safeLimit) {
    const needed = safeLimit - items.length;
    const matchedTags = categoryTagAliases[effectiveType] || [effectiveType];
    const existingIds = new Set(items.map((it) => String(it._id)));

    const fallbackPostMatch = {
      isDeleted: false,
      isPublic: true,
      shadowBanned: false,
      $or: [
        { "contentRef.type": effectiveType },
        { "entities.type": effectiveType },
        { tags: { $in: matchedTags } },
      ],
      "contentRef.externalId": { $ne: idAsString },
      "entities.externalId": { $ne: idAsString },
    };

    const fallbackWheelMatch = {
      isDeleted: { $ne: true },
      isPublic: true,
      "data.3": { $exists: true },
      $or: [
        { "relatedTopics.type": effectiveType },
        { tags: { $in: matchedTags } },
      ],
      "relatedTopics.id": { $ne: idAsString },
    };

    const fetchFallbackPosts = includePosts
      ? Post.find(fallbackPostMatch)
          .sort(sortCriterion)
          .limit(needed + 5)
          .select("_id userId content hasTruncation image imageVariants tags contentRef entities hasPoll pollOptions likeCount commentCount createdAt hotScore authorName authorHandle authorImage ogMeta isPublic")
          .lean()
      : Promise.resolve([]);

    const fetchFallbackWheels = includeWheels
      ? Wheel.find(fallbackWheelMatch)
          .sort(sortCriterion)
          .limit(needed + 5)
          .select("_id title description content createdBy authorName authorHandle authorProfileImage createdAt hotScore wheelPreview tags likeCount commentCount isPublic slug")
          .lean()
      : Promise.resolve([]);

    const [fbPosts, fbWheels] = await Promise.all([fetchFallbackPosts, fetchFallbackWheels]);
    const typedFbPosts = (fbPosts || [])
      .filter((r) => !existingIds.has(String(r._id)))
      .map((r) => ({ ...r, _docType: "post", _feedStage: "cat" }));
    const typedFbWheels = (fbWheels || [])
      .filter((r) => !existingIds.has(String(r._id)))
      .map((r) => ({ ...r, _docType: "wheel", content: r.description, _feedStage: "cat" }));

    const mergedFallback = includePosts && includeWheels
      ? interleavePostsAndWheels(typedFbPosts, typedFbWheels, needed)
      : mergeByHotScore(typedFbPosts, typedFbWheels).slice(0, needed);
    items = [...items, ...mergedFallback];
  } else if (isCategoryStageCursor) {
    // In Stage 2 (already cascading category feed), mark all items with stage "cat"
    items = items.map((it) => ({ ...it, _feedStage: "cat" }));
  }

  const currentListOffset = decodedCursor?.listOffset || 0;

  // Inject 1 high-quality List (~15% of an 8-item page) into Global and Category Hub feeds.
  // Combined with ~5 Posts (~60%) and ~2 Wheels (~25%), this achieves the 60/25/15 content blend.
  if (includeLists && !userId && !tag && !externalId) {
    try {
      // Candidate lists: light query fetching only _id first to prevent loading 30 full
      // documents with 10-item poster slices on every page scroll just to pick 1 list.
      const candidateIds = await UnifiedList.find(listMatch)
        .select({ _id: 1 })
        .sort(sortCriterion)
        .limit(30)
        .lean();

      // Deterministic pick: rotate through candidates by page number so each
      // page shows a different list, without depending on a drifting offset.
      let topList = null;
      if (candidateIds.length > 0 && currentListOffset < candidateIds.length) {
        const pageIndex = Math.max(0, currentListOffset);
        const chosenId = candidateIds[pageIndex]._id;

        // Fetch only the single selected winning list with items
        topList = await UnifiedList.findById(chosenId)
          .select({ name: 1, description: 1, userId: 1, createdAt: 1, hotScore: 1, likeCount: 1, commentCount: 1, items: { $slice: 10 }, slug: 1, format: 1 })
          .lean();
      }

      if (topList) {
        const list = {
          ...topList,
          _id: topList._id.toString(),
          _docType: "list",
          createdAt: topList.createdAt instanceof Date
            ? topList.createdAt.toISOString()
            : String(topList.createdAt),
        };

        // Avoid showing the same list twice if the aggregator already included it.
        items = items.filter(
          (item) => !(item._docType === "list" && String(item._id) === list._id)
        );

        // Insert at slot 3 (after initial posts + wheel) for natural 60/25/15 pacing.
        // The caller's slice pushes the displaced post/wheel into the cursor slot.
        items.splice(Math.min(3, items.length), 0, list);
      }
    } catch (e) {
      console.error("Error blending top list:", e);
    }
  }

  // Backfill authors with a optimized single lookup where possible
  const postUserIds = [...new Set(items.filter(r => (r._docType === "post" || r._docType === "list" || r._docType === "wheel") && r.userId && (!r.authorName || !r.authorHandle)).map(r => String(r.userId)))];
  const creatorEmails = [...new Set(items.filter(r => r._docType === "wheel" && r.authorName && (r.authorName.includes("@") || !r.authorHandle)).map(r => r.authorName))];

  const [users, creatorsByEmail] = await Promise.all([
    postUserIds.length ? User.find({ _id: { $in: postUserIds } }).select("name username").lean() : [],
    creatorEmails.length ? User.find({ email: { $in: creatorEmails } }).select("email name username").lean() : []
  ]);

  return mapFeedResults(items, users, creatorsByEmail);
}

/**
 * Safe wrapper around getFeedItems that degrades to an empty array on error.
 * Use in server page components and Suspense-bound async components so a feed
 * query failure does not crash the entire route.
 */
export async function getFeedItemsSafe(opts) {
  try {
    return await getFeedItems(opts);
  } catch (err) {
    console.error("[getFeedItemsSafe] feed fetch failed:", err);
    return [];
  }
}