import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import PostVote from "@models/postVote";
import { cleanupBlobAssets } from "@lib/blob-cleanup";

/**
 * GET /api/post/[id]
 *
 * Fetches a post by ID. Returns post data for editing or viewing.
 * Owner can edit, anyone can view public posts.
 */
export async function GET(req, { params }) {
  try {
    const { id } = params;
    await connectMongoDB();

    const post = await Post.findById(id).lean();

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (post.isDeleted) {
      return NextResponse.json({ message: "Post has been deleted" }, { status: 410 });
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { content, image, hasPoll, pollOptions, tags, isPublic, ogMeta } = await req.json();

    await connectMongoDB();

    const post = await Post.findById(id).select("userId authorName isDeleted");

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (post.isDeleted) {
      return NextResponse.json({ message: "Post has been deleted" }, { status: 410 });
    }

    // Allow editing only by the post author (multi-tier check: userId OR authorName)
    const isOwnPost =
      (session?.user?.id && post.userId && String(session.user.id) === String(post.userId)) ||
      (session?.user?.name && post.authorName && session.user.name === post.authorName);

    if (!isOwnPost) {
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
        }
      }
    }

    // Build update object
    const updateData = {};
    if (content !== undefined) updateData.content = content.trim();
    if (image !== undefined) updateData.image = image || null;
    if (hasPoll !== undefined) updateData.hasPoll = hasPoll;
    if (pollOptions !== undefined && hasPoll !== false) {
      updateData.pollOptions = hasPoll
        ? pollOptions
            .filter((o) => o.text?.trim())
            .map((opt) => ({
              text: opt.text?.trim() || "",
              voteCount: opt.voteCount || 0,
            }))
        : [];
    }
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (ogMeta !== undefined) updateData.ogMeta = ogMeta || null;

    await Post.updateOne({ _id: id }, { $set: updateData });

    return NextResponse.json({ message: "Post updated", id });
  } catch (err) {
    console.error("PATCH /api/post/[id] error:", err);
    return NextResponse.json({ message: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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

    // Allow deletion only by the post author (multi-tier check: userId OR authorName)
    const isOwnPost =
      (session?.user?.id && post.userId && String(session.user.id) === String(post.userId)) ||
      (session?.user?.name && post.authorName && session.user.name === post.authorName);

    if (!isOwnPost) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await Post.updateOne({ _id: id }, { $set: { isDeleted: true, isPublic: false } });

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
