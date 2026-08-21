import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import PostVote from "@models/postVote";
import { sessionUser } from "@utils/SessionData";
import { cleanupBlobAssets } from "@lib/blob-cleanup";

const POST_API_PROJECTION =
  "userId content hasTruncation authorName authorHandle authorImage title image imageVariants ogMeta contentRef hasPoll pollOptions isPublic isDeleted shadowBanned indexed createdAt updatedAt likeCount commentCount tags";

/**
 * GET /api/post/[id]
 *
 * Fetches a post by ID. Public posts are visible to anyone.
 * Private, deleted, or shadow-banned posts are visible only to the author.
 */
export async function GET(req, { params }) {
  try {
    const { id } = params;
    await connectMongoDB();

    const post = await Post.findById(id).select(POST_API_PROJECTION).lean();

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    const isRestricted = post.isDeleted || post.shadowBanned || post.isPublic === false;
    if (isRestricted) {
      const sessionData = await sessionUser("_id");
      const requestingUserId = sessionData?.userId;
      const isOwner = requestingUserId && String(requestingUserId) === String(post.userId);
      if (!isOwner) {
        const status = post.isDeleted ? 410 : 403;
        const message = post.isDeleted ? "Post has been deleted" : "Post is not available";
        return NextResponse.json({ message }, { status });
      }
    }

    return NextResponse.json(post);
  } catch (err) {
    console.error("GET /api/post/[id] error:", err);
    return NextResponse.json({ message: "Failed to fetch post" }, { status: 500 });
  }
}

/**
 * DELETE /api/post/[id]
 *
 * Soft-deletes a post by setting isDeleted = true.
 * Only the post author may delete their own post.
 */
/**
 * PATCH /api/post/[id]
 *
 * Updates an existing post. Only the post author may edit their own post.
 * Supports updating: content, image, hasPoll, pollOptions, tags, isPublic.
 */
export async function PATCH(req, { params }) {
  try {
    const sessionData = await sessionUser("_id");
    if (!sessionData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { content, image, imageVariants, hasPoll, pollOptions, tags, isPublic, ogMeta } = await req.json();

    await connectMongoDB();

    const post = await Post.findById(id).select("userId authorName isDeleted");

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (post.isDeleted) {
      return NextResponse.json({ message: "Post has been deleted" }, { status: 410 });
    }

    // Allow editing only by the post author. Display names are not unique,
    // so we rely solely on the stable userId comparison.
    if (!sessionData.userId || !post.userId || String(sessionData.userId) !== String(post.userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Validate content
    if (content !== undefined) {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return NextResponse.json({ message: "Post content cannot be empty" }, { status: 400 });
      }
      if (trimmedContent.length > 600) {
        return NextResponse.json({ message: "Post exceeds 600 character limit" }, { status: 400 });
      }
    }

    // Validate poll
    if (hasPoll !== undefined) {
      if (hasPoll && image) {
        return NextResponse.json(
          { message: "Posts cannot have both image and poll" },
          { status: 400 }
        );
      }

      if (hasPoll && pollOptions) {
        const activeOptions = pollOptions.filter((o) => o.text?.trim());
        if (activeOptions.length < 2 || activeOptions.length > 6) {
          return NextResponse.json(
            { message: "Poll must have 2-6 options" },
            { status: 400 }
          );
        }
        for (const opt of activeOptions) {
          if (opt.text?.length > 65) {
            return NextResponse.json(
              { message: "Each poll option must be 65 characters or less" },
              { status: 400 }
            );
          }
          if (opt.image && typeof opt.image !== "string") {
            return NextResponse.json(
              { message: "Poll option image must be a valid URL" },
              { status: 400 }
            );
          }
        }
      }
    }

    // Build update object
    const updateData = {};
    if (content !== undefined) updateData.content = content.trim();
    if (image !== undefined) updateData.image = image || null;
    if (imageVariants !== undefined) {
      updateData.imageVariants = imageVariants
        ? {
            sm: imageVariants.sm || image || null,
            md: imageVariants.md || image || null,
            lg: imageVariants.lg || image || null,
          }
        : null;
    }
    if (hasPoll !== undefined) updateData.hasPoll = hasPoll;
    if (pollOptions !== undefined && hasPoll !== false) {
      updateData.pollOptions = hasPoll
        ? pollOptions
            .filter((o) => o.text?.trim())
            .map((opt) => ({
              text: opt.text?.trim() || "",
              image: opt.image || null,
              imageVariants: opt.imageVariants
                ? {
                    sm: opt.imageVariants.sm || opt.image || null,
                    md: opt.imageVariants.md || opt.image || null,
                  }
                : null,
              voteCount: opt.voteCount || 0,
            }))
        : [];
    }
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (ogMeta !== undefined) updateData.ogMeta = ogMeta || null;

    await Post.updateOne({ _id: id }, { $set: updateData });

    revalidateTag(`profile-${post.userId}`);

    return NextResponse.json({ message: "Post updated", id });
  } catch (err) {
    console.error("PATCH /api/post/[id] error:", err);
    return NextResponse.json({ message: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const sessionData = await sessionUser("_id");
    if (!sessionData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await connectMongoDB();

    const post = await Post.findById(id).select("userId authorName isDeleted hasPoll image").lean();

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (post.isDeleted) {
      return NextResponse.json({ message: "Already deleted" }, { status: 410 });
    }

    // Allow deletion only by the post author. Display names are not unique,
    // so we rely solely on the stable userId comparison.
    if (!sessionData.userId || !post.userId || String(sessionData.userId) !== String(post.userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await Post.updateOne({ _id: id }, { $set: { isDeleted: true, isPublic: false } });

    revalidateTag(`profile-${post.userId}`);

    // Clean up orphaned poll votes — no value keeping them after deletion
    if (post.hasPoll) {
      await PostVote.deleteMany({ postId: id });
    }

    // Clean up post image if it's on Vercel Blob
    if (post.image && post.image.includes(".blob.vercel-storage.com")) {
      cleanupBlobAssets(post.image).catch(err => 
        console.error("Delayed cleanup failed for post image:", err)
      );
    }

    return NextResponse.json({ message: "Post deleted" });
  } catch (err) {
    console.error("DELETE /api/post/[id] error:", err);
    return NextResponse.json({ message: "Failed to delete post" }, { status: 500 });
  }
}
