import { notFound } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import Post from "@models/post";
import User from "@models/user";
import PostCard from "@components/PostCard";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export default async function SinglePostPage({ params }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectMongoDB();

  // Find the post; author is fetched separately via userId below
  const post = await Post.findById(id).lean();

  if (!post) {
    notFound();
  }

  const postAuthor = await User.findById(post.userId).select("name avatar").lean();

  // Structure the post for the PostCard component
  const postData = {
    ...post,
    id: post._id.toString(),
    _id: post._id.toString(),
    authorName: postAuthor?.name || "Someone",
    authorAvatar: postAuthor?.avatar || null,
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
      <div className="mb-6 border border-border bg-card rounded-xl overflow-hidden shadow-sm">
        <PostCard post={postData} defaultOpenComments={true} />
      </div>
    </main>
  );
}
