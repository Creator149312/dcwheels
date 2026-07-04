import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import User from "@models/user";
import { shadowBanUser } from "@lib/shadowBan";

// Regex that matches any URL-like token (http://, https://, www.)
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/i;
// Posts per minute that triggers a shadow-ban (rate limit)
const RATE_LIMIT_PER_MINUTE = 10;

/**
 * POST /api/post/create
 * Create a new post or ask
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email })
      .select("_id shadowBanned name username")
      .lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      content = "",
      image = null,
      contentRef = null,
      hasPoll = false,
      pollOptions = [],
      tags = [],
      isPublic = true,
      ogMeta = null,
    } = body;

    // ── 1. Content Restrictions ─────────────────────────────────────────────
    // We treat the content as the master text, similar to Facebook/Threads.
    const masterText = content.trim();
    
    if (!masterText) {
      return NextResponse.json({ message: "Post content is required" }, { status: 400 });
    }

    if (masterText.length > 600) {
      return NextResponse.json({ message: "Post must be 600 characters or less" }, { status: 400 });
    }

    if (hasPoll && image) {
      return NextResponse.json(
        { message: "Choose either an image or a poll for a post, not both." },
        { status: 400 }
      );
    }

    // ── 2. Anti-spam checks ────────────────────────────────────────────────────

    // Link-drop guard
    const containsLink = URL_PATTERN.test(masterText);

    // Rate-limit: >10 posts in the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentCount = await Post.countDocuments({
      userId: user._id,
      createdAt: { $gte: oneMinuteAgo },
    });
    const isSpamming = recentCount >= RATE_LIMIT_PER_MINUTE;

    // Shadow-ban logic
    const shouldShadowBan = containsLink || isSpamming || user.shadowBanned;
    if (containsLink || isSpamming) {
      await shadowBanUser(user._id);
    }

    // ── 3. Poll Restrictions ──────────────────────────────────────────────────
    if (hasPoll) {
      if (!Array.isArray(pollOptions) || pollOptions.length < 2 || pollOptions.length > 6) {
        return NextResponse.json(
          { message: "Poll must have 2-6 options" },
          { status: 400 }
        );
      }

      for (const opt of pollOptions) {
        const text = (typeof opt === "string" ? opt : opt.text || "").trim();
        if (!text) {
          return NextResponse.json({ message: "Poll options cannot be empty" }, { status: 400 });
        }
        if (text.length > 65) {
          return NextResponse.json(
            { message: "Poll options must be 65 characters or less" },
            { status: 400 }
          );
        }
      }
    }

    // Create post
    const post = new Post({
      userId: user._id,
      authorName: user.name || "Someone",
      authorHandle: user.username || null,
      content: masterText,
      image: image || null,
      contentRef: contentRef || null,
      hasPoll: !!hasPoll,
      pollOptions: hasPoll
        ? pollOptions.map((opt) => ({
            text: (typeof opt === "string" ? opt : opt.text).trim(),
            voteCount: 0,
          }))
        : [],
      tags: Array.isArray(tags)
        ? tags
            .map((t) => (typeof t === "string" ? t.toLowerCase().trim() : t))
            .filter(Boolean)
        : [],
      isPublic: !!isPublic,
      ogMeta,
      shadowBanned: shouldShadowBan,
    });

    await post.save();

    return NextResponse.json({
      id: String(post._id),
      message: "Post created successfully",
    });
  } catch (err) {
    console.error("POST /api/post/create error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to create post" },
      { status: 500 }
    );
  }
}
