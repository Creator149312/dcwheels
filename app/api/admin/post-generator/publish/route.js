import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import mongoose from "mongoose";
import User from "@models/user";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

/**
 * POST /api/admin/post-generator/publish
 *
 * Saves approved draft posts to the database.
 * Body: { posts: [{ title, content, pollOptions, tags, contentRef }] }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { posts } = await req.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ message: "No posts to publish" }, { status: 400 });
    }

    await connectMongoDB();
    const db = mongoose.connection.db;

    // PERSONAS with valid database IDs from verify-all-users.js
    const personas = [
      { id: "6a49165a4e84a6766406ad59", name: "ShadowRogueX", handle: "ShadowRogueX" },
      { id: "6a4916b84e84a6766406ada0", name: "LibertyEagle", handle: "LibertyEagle" },
      { id: "6a4916934e84a6766406ad8e", name: "MysticLotusIN", handle: "MysticLotusIN" },
      { id: "6a49166c4e84a6766406ad73", name: "PixelSamurai77", handle: "PixelSamurai77" },
      { id: "6a4916a04e84a6766406ad97", name: "IronBritKnight", handle: "IronBritKnight" }
    ];

    const now = new Date();

    const docsToInsert = posts.map((p) => {
      // Pick a random persona for each post to look natural
      const persona = personas[Math.floor(Math.random() * personas.length)];
      
      // Random date within last 6 months
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const randomTimestamp = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()));

      const content = (p.content || "").trim().slice(0, 2000);
      
      // AUTO-TAG EXTRACTION:
      // Scan content for #[tag] patterns and add them to the tags array.
      // E.g. "I love #haikyu!!" -> adds "haikyu" to tags.
      let tags = Array.isArray(p.tags) ? p.tags : [];
      const hashtagRegex = /#(\w+)/g;
      const matches = content.matchAll(hashtagRegex);
      for (const match of matches) {
        const tag = match[1].toLowerCase();
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      }

      return {
        userId: new mongoose.Types.ObjectId(persona.id),
        authorName: persona.name,
        authorHandle: persona.handle,
        authorImage: null,
        content,
        type: (Array.isArray(p.pollOptions) && p.pollOptions.length >= 2) ? "poll" : "text",
        image: null,
        tags: tags.slice(0, 7), // Allow a few more tags if extracted from content
        isPublic: true,
        isDeleted: false,
        isShadowBanned: false,
        hasPoll: Array.isArray(p.pollOptions) && p.pollOptions.length >= 2,
        pollOptions: (p.pollOptions || []).slice(0, 4).map((opt) => ({
          _id: new mongoose.Types.ObjectId(),
          text: (opt.text || "").trim().slice(0, 100),
          voteCount: 0,
        })),
        contentRef: p.contentRef
          ? {
              type: p.contentRef.type || "",
              externalId: String(p.contentRef.externalId || ""),
              slug: p.contentRef.slug || null,
              title: (p.contentRef.title || "").slice(0, 200),
              image: p.contentRef.image || null,
            }
          : null,
        likeCount: 0,
        commentCount: 0,
        viewCount: Math.floor(Math.random() * 50),
        status: "published",
        createdAt: randomTimestamp,
        updatedAt: randomTimestamp,
      };
    });

    // Enrich contentRef with the full slug (needed for correct PostCard links).
    // Posts from AI drafts arrive without a slug, so we look it up once per
    // unique (type, externalId) pair and patch all affected docs.
    try {
      const needsSlug = docsToInsert.filter(
        (d) => d.contentRef?.type && d.contentRef?.externalId && !d.contentRef.slug
      );
      if (needsSlug.length > 0) {
        // Deduplicate lookups
        const seen = new Map();
        for (const doc of needsSlug) {
          const key = `${doc.contentRef.type}::${doc.contentRef.externalId}`;
          if (!seen.has(key)) {
            seen.set(key, { type: doc.contentRef.type, externalId: doc.contentRef.externalId });
          }
        }
        for (const { type, externalId } of seen.values()) {
          const topicPage = await db.collection("topicpages").findOne(
            { type, relatedId: parseInt(externalId) || externalId },
            { projection: { slug: 1 } }
          );
          if (topicPage?.slug) {
            const key = `${type}::${externalId}`;
            for (const doc of docsToInsert) {
              if (
                doc.contentRef?.type === type &&
                doc.contentRef?.externalId === externalId &&
                doc.contentRef.slug === null
              ) {
                doc.contentRef.slug = topicPage.slug;
              }
            }
          }
        }
      }
    } catch {
      // Non-fatal: slug enrichment is best-effort
    }

    const result = await db.collection("posts").insertMany(docsToInsert);

    // Revalidate the topic page so new posts appear immediately (bypass ISR cache)
    try {
      const firstPost = docsToInsert[0];
      if (firstPost?.contentRef?.type && firstPost?.contentRef?.slug) {
        revalidatePath(`/${firstPost.contentRef.type}/${firstPost.contentRef.slug}`);
      }
    } catch {
      // Non-fatal: revalidation is best-effort
    }

    return NextResponse.json({
      message: `Published ${result.insertedCount} post(s) successfully.`,
      insertedCount: result.insertedCount,
    });
  } catch (err) {
    console.error("POST /api/admin/post-generator/publish error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
