import { NextResponse } from "next/server";
import {
  searchPosts,
  searchLists,
  searchWheelsDirect,
  searchTopicHubs,
} from "@app/search/[titlesearch]/fetchSearchFeed";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "top"; // "top", "wheels", "lists", "topics", "anime", etc.
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ items: [], hasMore: false });
    }

    if (type === "lists") {
      const { lists, hasMore } = await searchLists(q, { limit, skip });
      return NextResponse.json({
        items: lists.map((l) => ({ kind: "list", data: l })),
        hasMore,
      });
    }

    if (type === "wheels") {
      const { wheels, hasMore } = await searchWheelsDirect(q, { limit, skip });
      return NextResponse.json({
        items: wheels.map((w) => ({ kind: "wheel", data: w })),
        hasMore,
      });
    }

    if (["topics", "anime", "movie", "game", "character"].includes(type)) {
      const topicType = type === "topics" ? "all" : type;
      const { topics, hasMore } = await searchTopicHubs(q, {
        limit,
        skip,
        type: topicType,
      });
      return NextResponse.json({
        items: topics.map((t) => ({ kind: "topic", data: t })),
        hasMore,
      });
    }

    if (type === "posts") {
      const { posts, hasMore } = await searchPosts(q, { limit, skip });
      return NextResponse.json({
        items: posts.map((p) => ({ kind: "post", data: p })),
        hasMore,
      });
    }

    // Default: "top" stream (interleaved posts and lists)
    const postLimit = Math.max(1, Math.round(limit * 0.7)); // ~70% posts, ~30% lists
    const listLimit = Math.max(1, limit - postLimit);

    const [{ posts, hasMore: postsHasMore }, { lists, hasMore: listsHasMore }] = await Promise.all([
      searchPosts(q, { limit: postLimit, skip }),
      searchLists(q, { limit: listLimit, skip: Math.floor(skip * 0.4) }),
    ]);

    const feedItems = [];
    let lIdx = 0;
    posts.forEach((post, idx) => {
      feedItems.push({ kind: "post", data: post });
      if ((idx + 1) % 3 === 0 && lIdx < lists.length) {
        feedItems.push({ kind: "list", data: lists[lIdx++] });
      }
    });
    while (lIdx < lists.length) {
      feedItems.push({ kind: "list", data: lists[lIdx++] });
    }

    return NextResponse.json({
      items: feedItems,
      hasMore: postsHasMore || listsHasMore,
    });
  } catch (err) {
    console.error("Search stream API error:", err);
    return NextResponse.json({ items: [], hasMore: false }, { status: 500 });
  }
}
