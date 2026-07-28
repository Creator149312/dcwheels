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
    const base = {
      id: String(r._id),
      _id: String(r._id),
      docType,
      title: r.title || r.name || null,
      hasTruncation: r.hasTruncation || false,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      tags: r.tags || [],
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
          voteCount: o.voteCount || 0,
        })),
        likeCount: r.likeCount || 0,
        commentCount: r.commentCount || 0,
        image: r.image || null,
        contentRef: r.contentRef || null,
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
        title: r.name || r.title || "Untitled List", // List name is stored in "name" field
        userId: String(r.userId),
        authorName: nameById.get(String(r.userId)) || "Community",
        authorHandle: handleById.get(String(r.userId)) || null,
        description: r.description || "",
        items: (r.items || []).map(item => ({
          ...item,
          _id: item._id ? String(item._id) : Math.random().toString(36).substring(7)
        })),
        isPublic: true,
      };
    }
  });
}

/**
 * Unified feed fetcher for Global, Topic, Tag, and User Profile pages.
 */
export async function getFeedItems({ 
  type, 
  externalId, 
  tag, 
  userId, 
  docType: requestedDocType, 
  limit = 8, 
  lastTimestamp = null,
  showPrivate = false
}) {
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  const postMatch = { isDeleted: false, shadowBanned: false };
  const wheelMatch = {};
  const listMatch = { isSystem: { $ne: true } }; // Don't show "My Library" etc in feed

  // For Global Feed Discovery: High-quality filtering (Entities only, min items)
  const isGlobalFeed = !userId && !tag && !type && !externalId;
  
  if (!showPrivate) {
    postMatch.isPublic = true;
    wheelMatch.isPublic = true;
    // Support both deprecated isPublic and new settings.visibility
    listMatch.$or = [
      { isPublic: true },
      { "settings.visibility": "public" }
    ];

    // UNIVERSAL RULE: Only show high-quality lists in discovery feeds.
    // 1. Ensure they have at least 5 items for a "Premium" look.
    // 2. Ensure they are "Entity" lists (Movies, Anime, Games) for discovery value.
    listMatch["items.4"] = { $exists: true }; 
    listMatch["items.type"] = "entity";

    if (isGlobalFeed) {
      // Additional global-only filters can go here if needed in the future
    }
  }
  
  if (lastTimestamp) {
    const cursorDate = new Date(lastTimestamp);
    postMatch.createdAt = { $lt: cursorDate };
    wheelMatch.createdAt = { $lt: cursorDate };
    listMatch.createdAt = { $lt: cursorDate };
  }

  if (userId) {
    const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    postMatch.userId = uid;
    wheelMatch.userId = uid;
    listMatch.userId = uid;
  } else {
    // For global feed, lists don't really have tags or contentRef easily indexed for now
    // If tag is present, we might skip lists or filter them if possible
    if (type && externalId) {
      postMatch["contentRef.type"] = type;
      postMatch["contentRef.externalId"] = String(externalId);
      wheelMatch["relatedTopics"] = { $elemMatch: { type, id: String(externalId) } };
      // Lists could potentially have related topics, but for now we'll skip them or filter by items
      listMatch["items.entityId"] = String(externalId);
    } else if (tag) {
      if (tag.includes(",")) {
        const tags = tag.split(",").map(t => t.trim()).filter(Boolean);
        postMatch.tags = { $in: tags };
        wheelMatch.tags = { $in: tags };
      } else {
        postMatch.tags = tag;
        wheelMatch.tags = tag;
      }
      // Lists don't have tags field yet
    }
  }

  const includePosts = !requestedDocType || requestedDocType.includes("post");
  const includeWheels = !requestedDocType || requestedDocType.includes("wheel");
  // INDUSTRY STANDARD: On specific context pages (Topic/Tag), we default to Primary Content only.
  // Lists are "Organizational" content and are best discovered on Home/Global feeds.
  const isContextualPage = Boolean(tag || (type && externalId));
  const includeLists = requestedDocType 
    ? requestedDocType.includes("list") 
    : (isContextualPage ? false : true);

  const postProjection = {
    _docType: { $literal: "post" },
    _id: 1, userId: 1, content: 1, hasTruncation: 1, image: 1, tags: 1, contentRef: 1,
    hasPoll: 1, pollOptions: 1, likeCount: 1, commentCount: 1, createdAt: 1,
    authorName: 1, authorHandle: 1, authorImage: 1, category: 1, isPublic: 1,
  };

  const wheelProjection = {
    _docType: { $literal: "wheel" },
    _id: 1, title: 1, description: 1, content: "$description",
    authorName: 1, createdBy: 1, authorHandle: 1, authorProfileImage: 1,
    createdAt: 1, wheelPreview: 1, tags: 1, likeCount: 1, isPublic: 1,
    slug: 1, // High-priority for unified /wheels/[slug] routing
  };

  const listProjection = {
    _docType: { $literal: "list" },
    _id: 1, name: 1, description: 1, userId: 1, createdAt: 1,
    items: { $slice: ["$items", 10] }, // Only need first few items for preview
  };

  let items = [];

  // Build pipeline dynamically
  let pipeline = [];
  if (includePosts) {
    pipeline = [{ $match: postMatch }, { $project: postProjection }];
    if (includeWheels) {
      pipeline.push({ $unionWith: { coll: "wheels", pipeline: [{ $match: wheelMatch }, { $project: wheelProjection }] } });
    }
    if (includeLists) {
      pipeline.push({ $unionWith: { coll: "unifiedlists", pipeline: [{ $match: listMatch }, { $project: listProjection }] } });
    }
  } else if (includeWheels) {
    pipeline = [{ $match: wheelMatch }, { $project: wheelProjection }];
    if (includeLists) {
      pipeline.push({ $unionWith: { coll: "unifiedlists", pipeline: [{ $match: listMatch }, { $project: listProjection }] } });
    }
  } else if (includeLists) {
    pipeline = [{ $match: listMatch }, { $project: listProjection }];
  }

  if (pipeline.length > 0) {
    // Determine the base model/collection to start from
    const BaseModel = includePosts ? Post : (includeWheels ? Wheel : UnifiedList);
    
    items = await BaseModel.aggregate([
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $limit: safeLimit }
    ]);
  }

  // Inject some recent public lists at the top if we are loading the first page of the global feed
  if (includeLists && !lastTimestamp && !userId && !type && !tag && !externalId) {
    try {
      // Use the same listMatch quality filters for the boosted top lists
      const topLists = await UnifiedList.find(listMatch)
        .select({ name: 1, description: 1, userId: 1, createdAt: 1, items: { $slice: 10 } })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
      
      if (topLists && topLists.length > 0) {
        const formattedTopLists = topLists.map(l => ({
          ...l,
          _id: l._id.toString(),
          _docType: "list",
          createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt)
        }));

        // Filter out any copies of these lists from the main items list to avoid duplicates
        items = items.filter(item => !(item._docType === "list" && formattedTopLists.some(tl => tl._id === String(item._id))));

        // Insert them at strategic points: first list at index 2, second list at index 8
        if (items.length >= 2) {
          items.splice(2, 0, formattedTopLists[0]);
          if (formattedTopLists[1] && items.length >= 9) {
            items.splice(9, 0, formattedTopLists[1]);
          } else if (formattedTopLists[1]) {
            items.push(formattedTopLists[1]);
          }
          if (formattedTopLists[2]) {
            items.push(formattedTopLists[2]);
          }
        } else {
          items.push(...formattedTopLists);
        }
      }
    } catch (e) {
      console.error("Error blending top lists:", e);
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