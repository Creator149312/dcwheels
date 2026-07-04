import { connectMongoDB } from "@/lib/mongodb";
import Post from "@/models/post";
import Wheel from "@/models/wheel";
import User from "@/models/user";
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
      title: r.title || null,
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
    } else {
      // wheel
      let authorDisplayName = r.authorName || r.createdBy || "Community";
      let authorHandle = r.authorHandle || null;

      if (authorDisplayName && authorDisplayName.includes("@")) {
        const creatorEmail = authorDisplayName;
        authorDisplayName = nameByEmail.get(creatorEmail) || "Community";
        authorHandle = authorHandle || handleByEmail.get(creatorEmail) || null;
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

  if (!showPrivate) {
    postMatch.isPublic = true;
    wheelMatch.isPublic = true;
  }
  
  if (lastTimestamp) {
    const cursorDate = new Date(lastTimestamp);
    postMatch.createdAt = { $lt: cursorDate };
    wheelMatch.createdAt = { $lt: cursorDate };
  }

  if (userId) {
    const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    postMatch.userId = uid;
    wheelMatch.userId = uid;
  } else {
    if (type && externalId) {
      postMatch["contentRef.type"] = type;
      postMatch["contentRef.externalId"] = String(externalId);
      wheelMatch["relatedTopics"] = { $elemMatch: { type, id: String(externalId) } };
    } else if (tag) {
      postMatch.tags = tag;
      wheelMatch.tags = tag;
    }
  }

  const includePosts = !requestedDocType || requestedDocType === "post";
  const includeWheels = !requestedDocType || requestedDocType === "wheel";

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
  };

  let items = [];
  if (includePosts && includeWheels) {
    items = await Post.aggregate([
      { $match: postMatch },
      { $project: postProjection },
      { $unionWith: { coll: "wheels", pipeline: [{ $match: wheelMatch }, { $project: wheelProjection }] } },
      { $sort: { createdAt: -1 } },
      { $limit: safeLimit }
    ]);
  } else if (includePosts) {
    items = await Post.aggregate([
      { $match: postMatch },
      { $project: postProjection },
      { $sort: { createdAt: -1 } },
      { $limit: safeLimit }
    ]);
  } else if (includeWheels) {
    items = await Wheel.aggregate([
      { $match: wheelMatch },
      { $project: wheelProjection },
      { $sort: { createdAt: -1 } },
      { $limit: safeLimit }
    ]);
  }

  // Backfill authors
  const postUserIds = [...new Set(items.filter(r => r._docType === "post" && r.userId && (!r.authorName || !r.authorHandle)).map(r => String(r.userId)))];
  const creatorEmails = [...new Set(items.filter(r => r._docType === "wheel" && r.authorName && (r.authorName.includes("@") || !r.authorHandle)).map(r => r.authorName))];

  const [users, creatorsByEmail] = await Promise.all([
    postUserIds.length ? User.find({ _id: { $in: postUserIds } }).select("name username").lean() : [],
    creatorEmails.length ? User.find({ email: { $in: creatorEmails } }).select("email name username").lean() : []
  ]);

  return mapFeedResults(items, users, creatorsByEmail);
}