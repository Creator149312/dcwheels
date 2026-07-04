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

    // Get bot/admin user
    const botUser = await User.findOne({ email: ADMIN_EMAIL }).select("_id name image").lean();
    if (!botUser) {
      return NextResponse.json({ message: "Admin user not found" }, { status: 404 });
    }

    const now = new Date();

    const docsToInsert = posts.map((p) => ({
      userId: botUser._id,
      authorName: botUser.name || "Spinpapa",
      authorImage: botUser.image || null,
      title: (p.title || "").trim().slice(0, 500),
      content: (p.content || "").trim().slice(0, 2000),
      image: null,
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 5) : [],
      isPublic: true,
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
      createdAt: now,
      updatedAt: now,
    }));

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
