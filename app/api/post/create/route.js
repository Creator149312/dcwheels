import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import TopicPage from "@models/topicpage";
import { sessionUser } from "@utils/SessionData";
import { shadowBanUser } from "@lib/shadowBan";
import { validateContentSafety } from "@lib/contentSafety";
import { normalizeTag } from "@lib/slug";
// Posts per minute that triggers a shadow-ban (rate limit)
const RATE_LIMIT_PER_MINUTE = 10;

/**
 * POST /api/post/create
 * Create a new post or ask
 */
export async function POST(req) {
  try {
    await connectMongoDB();
    const sessionData = await sessionUser("_id shadowBanned name username");
    if (!sessionData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId, user } = sessionData;
    if (!userId || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      content = "",
      image = null,
      imageVariants = null,
      contentRef = null,
      entities = null,
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

    // Tier 1 Content Safety Gate (Write-Time Hard Reject)
    const pollTexts = Array.isArray(pollOptions)
      ? pollOptions.map((o) => (typeof o === "string" ? o : o?.text || ""))
      : [];
    const safetyCheck = validateContentSafety([
      masterText,
      ...(Array.isArray(tags) ? tags : []),
      ...pollTexts,
    ]);
    if (!safetyCheck.isSafe) {
      return NextResponse.json({ message: safetyCheck.error }, { status: 400 });
    }

    if (hasPoll && image) {
      return NextResponse.json(
        { message: "Choose either an image or a poll for a post, not both." },
        { status: 400 }
      );
    }

    // ── 2. Anti-spam checks ────────────────────────────────────────────────────

    // Rate-limit: >10 posts in the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentCount = await Post.countDocuments({
      userId: user._id,
      createdAt: { $gte: oneMinuteAgo },
    });
    const isSpamming = recentCount >= RATE_LIMIT_PER_MINUTE;

    // Shadow-ban logic: link drops are no longer auto-banned; rely on
    // community reports or admin review instead. Only hard spam patterns
    // (e.g. flood posting) and existing bans are applied automatically.
    const shouldShadowBan = isSpamming || user.shadowBanned;
    if (isSpamming) {
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
        const image = typeof opt === "string" ? null : opt.image || null;
        if (image && typeof image !== "string") {
          return NextResponse.json(
            { message: "Poll option image must be a valid URL" },
            { status: 400 }
          );
        }
      }
    }

    // ── Entity & Topic Anchor Normalization ─────────────────────────────────
    let finalEntities = Array.isArray(entities)
      ? entities
          .filter((e) => e && (e.externalId || e.slug || e.title))
          .slice(0, 3)
          .map((e) => ({
            type: e.type || "",
            externalId: e.externalId ? String(e.externalId) : "",
            slug: e.slug || "",
            title: e.title || "",
            image: e.image || null,
            segmentCount: Number(e.segmentCount) || 0,
          }))
      : [];

    let finalContentRef = contentRef;
    if (!finalContentRef && finalEntities.length > 0) {
      finalContentRef = finalEntities[0];
    } else if (finalContentRef && finalEntities.length === 0) {
      finalEntities = [finalContentRef];
    }

    const normalizedTags = Array.isArray(tags)
      ? tags
          .map((t) => (typeof t === "string" ? normalizeTag(t) : t))
          .filter(Boolean)
      : [];

    // If post is created within a parent TopicPage (contentRef is provided),
    // automatically inherit the parent Topic's canonical slug and top genre/meta tags.
    // This allows users to enjoy a clean-slate writing experience without having to type repetitive tags,
    // while ensuring the post surfaces in topic feeds and tag spaces with zero external API calls.
    if (finalContentRef?.type && (finalContentRef.slug || finalContentRef.externalId)) {
      try {
        const topicQuery = finalContentRef.slug
          ? { slug: finalContentRef.slug }
          : { type: finalContentRef.type, relatedId: finalContentRef.externalId };

        const parentTopic = await TopicPage.findOne(topicQuery)
          .select("slug tags type")
          .lean();

        if (parentTopic) {
          const inherited = [];
          if (parentTopic.slug) {
            inherited.push(normalizeTag(parentTopic.slug));
          }
          if (Array.isArray(parentTopic.tags)) {
            // Inherit up to 4 top genre/theme tags to keep indexing crisp and prevent tag bloat
            for (const t of parentTopic.tags.slice(0, 4)) {
              const norm = normalizeTag(t);
              if (norm && !inherited.includes(norm)) {
                inherited.push(norm);
              }
            }
          }

          // Merge without duplicates
          for (const t of inherited) {
            if (!normalizedTags.includes(t)) {
              normalizedTags.push(t);
            }
          }
        }
      } catch (err) {
        console.warn("Inheriting TopicPage tags failed:", err);
      }
    }

    // Safety-net fallback: If no entities were chosen, but user provided tags,
    // check if any tag exactly matches a canonical TopicPage slug and auto-bind.
    if (finalEntities.length === 0 && !finalContentRef && normalizedTags.length > 0) {
      try {
        const matchedTopic = await TopicPage.findOne({
          slug: { $in: normalizedTags },
        })
          .select("type relatedId slug title cover tags")
          .lean();

        if (matchedTopic) {
          const autoRef = {
            type: matchedTopic.type,
            externalId: String(matchedTopic.relatedId),
            slug: matchedTopic.slug,
            title:
              matchedTopic.title?.default ||
              matchedTopic.title?.english ||
              matchedTopic.title?.romaji ||
              matchedTopic.slug,
            image: matchedTopic.cover || null,
            segmentCount: 0,
          };
          finalContentRef = autoRef;
          finalEntities = [autoRef];

          // Inherit tags from matched topic as well
          const matchedSlug = normalizeTag(matchedTopic.slug);
          if (matchedSlug && !normalizedTags.includes(matchedSlug)) {
            normalizedTags.unshift(matchedSlug);
          }
          if (Array.isArray(matchedTopic.tags)) {
            for (const t of matchedTopic.tags.slice(0, 4)) {
              const norm = normalizeTag(t);
              if (norm && !normalizedTags.includes(norm)) {
                normalizedTags.push(norm);
              }
            }
          }
        }
      } catch (e) {
        console.warn("TopicPage tag fallback match failed:", e);
      }
    }

    // Create post
    const post = new Post({
      userId: user._id,
      authorName: user.name || "Someone",
      authorHandle: user.username || null,
      content: masterText,
      image: image || null,
      imageVariants: imageVariants
        ? {
            sm: imageVariants.sm || imageVariants.sm || null,
            md: imageVariants.md || image || null,
            lg: imageVariants.lg || image || null,
          }
        : null,
      contentRef: finalContentRef || null,
      entities: finalEntities,
      hasPoll: !!hasPoll,
      pollOptions: hasPoll
        ? pollOptions.map((opt) => ({
            text: (typeof opt === "string" ? opt : opt.text).trim(),
            image: typeof opt === "string" ? null : opt.image || null,
            imageVariants: typeof opt === "string" || !opt.imageVariants
              ? null
              : {
                  sm: opt.imageVariants.sm || opt.image || null,
                  md: opt.imageVariants.md || opt.image || null,
                },
            voteCount: 0,
          }))
        : [],
      tags: normalizedTags,
      isPublic: !!isPublic,
      ogMeta,
      shadowBanned: shouldShadowBan,
    });

    await post.save();

    revalidateTag(`profile-${user._id}`);

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
