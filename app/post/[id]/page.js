import { notFound } from "next/navigation";
import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import Post from "@models/post";
import User from "@models/user";
import PostCard from "@components/PostCard";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// Deduplicate database queries between generateMetadata and SinglePostPage during a single request
const getPostAndAuthor = cache(async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectMongoDB();
  const post = await Post.findById(id).lean();
  if (!post) return null;

  const author = post.userId
    ? await User.findById(post.userId).select("name avatar").lean()
    : null;

  return { post, author };
});

export async function generateMetadata({ params }) {
  const { id } = params;
  const data = await getPostAndAuthor(id);
  if (!data) {
    return { title: "Post Not Found", description: "The requested post does not exist." };
  }

  const { post, author } = data;
  const authorName = author?.name || "Someone";

  // Trim description for metadata
  const raw = (post.content || "").replace(/\s+/g, " ").trim();
  const description = raw.length > 160 ? raw.slice(0, 157).trim() + "..." : raw || `${authorName} shared a post.`;

  const metaTitle = `${authorName} — Post`;
  const image = post.image || null;

  return {
    title: metaTitle,
    description,
    openGraph: image ? { title: metaTitle, description, images: [image] } : { title: metaTitle, description },
  };
}

export default async function SinglePostPage({ params }) {
  const { id } = params;

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
    </main>
  );
}
