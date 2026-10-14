import { notFound } from "next/navigation";
import { cache } from "react";
import { cookies } from "next/headers";
import { connectMongoDB } from "@/lib/mongodb";
import Post from "@models/post";
import User from "@models/user";
import PostVote from "@models/postVote";
import PostCard from "@components/PostCard";
import mongoose from "mongoose";
import dynamicLoader from "next/dynamic";
import { getPostUrl } from "@utils/UrlHandler";
import { sessionUser } from "@utils/SessionData";
import { isPostAdEligible } from "@/lib/adEligibility";
import { GUEST_COOKIE_NAME } from "@/middleware";

const AdsUnit = dynamicLoader(() => import("@components/ads/AdsUnit"), {
  ssr: false,
});

// ISR: Cache public post pages and revalidate on demand or every 5 minutes.
// Eliminates cold/warm serverless function execution and DB hits on high-volume reads.
export const revalidate = 300;

// Deduplicate database queries between generateMetadata and SinglePostPage during a single request
const getPostAndAuthor = cache(async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectMongoDB();

  // Authors can view their own private/deleted/shadow-banned posts; everyone
  // else only sees live public content. This matches GET /api/post/[id].
  const sessionData = await sessionUser("_id").catch(() => null);
  const requestingUserId = sessionData?.userId?.toString?.() || sessionData?.userId;

  const POST_PAGE_PROJECTION =
    "userId content hasTruncation authorName authorHandle authorImage title image imageVariants ogMeta contentRef entities hasPoll pollOptions isPublic isDeleted shadowBanned indexed createdAt updatedAt likeCount commentCount tags";

  const unrestrictedPost = await Post.findById(id)
    .select(POST_PAGE_PROJECTION)
    .lean();
  if (!unrestrictedPost) return null;

  const isOwner = requestingUserId && String(unrestrictedPost.userId) === String(requestingUserId);
  const isRestricted = unrestrictedPost.isDeleted || unrestrictedPost.shadowBanned || unrestrictedPost.isPublic === false;

  if (isRestricted && !isOwner) return null;

  const author = unrestrictedPost.userId
    ? await User.findById(unrestrictedPost.userId).select("name avatar").lean()
    : null;

  // Resolve whether the current user (registered OR guest) has already voted on this post's poll
  let userVotedOptionId = null;
  if (unrestrictedPost.hasPoll) {
    let voteQuery = null;
    if (requestingUserId) {
      voteQuery = { postId: unrestrictedPost._id, userId: requestingUserId };
    } else {
      const guestId = cookies().get(GUEST_COOKIE_NAME)?.value;
      if (guestId) {
        voteQuery = { postId: unrestrictedPost._id, guestId };
      }
    }

    if (voteQuery) {
      const existingVote = await PostVote.findOne(voteQuery)
        .select("optionId")
        .lean();
      if (existingVote) {
        userVotedOptionId = String(existingVote.optionId);
      }
    }
  }

  return { post: { ...unrestrictedPost, userVotedOptionId }, author };
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await getPostAndAuthor(id);
  if (!data) {
    return { title: "Post Not Found", description: "The requested post does not exist.", robots: "noindex" };
  }

  const { post, author } = data;
  const authorName = author?.name || "Someone";

  // Trim description for metadata
  const raw = (post.content || "").replace(/\s+/g, " ").trim();
  const description = raw.length > 160 ? raw.slice(0, 157).trim() + "..." : raw || `${authorName} shared a post.`;

  const metaTitle = `${authorName} — Post`;
  const image = post.imageVariants?.full || post.image || post.contentRef?.image || null;

  const isIndexed = post.isPublic && !post.isDeleted && post.indexed !== false;

  return {
    title: metaTitle,
    description,
    alternates: {
      canonical: `https://www.spinpapa.com${getPostUrl(post)}`,
    },
    robots: {
      index: isIndexed,
      follow: true,
    },
    openGraph: {
      type: "article",
      title: metaTitle,
      description,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function SinglePostPage({ params }) {
  const { id } = await params;

  const data = await getPostAndAuthor(id);
  if (!data) {
    notFound();
  }

  const { post, author } = data;

  // Structure the post for the PostCard component
  const postData = {
    ...post,
    id: post._id.toString(),
    _id: post._id.toString(),
    authorName: author?.name || "Someone",
    authorAvatar: author?.avatar || null,
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
      <div className="mb-6 border border-border bg-card rounded-xl overflow-hidden shadow-sm">
        <PostCard post={postData} defaultOpenComments={true} />
      </div>

      {isPostAdEligible(post) && (
        <div className="min-h-[90px] my-6">
          <AdsUnit slot="4694567949" />
        </div>
      )}
    </main>
  );
}
