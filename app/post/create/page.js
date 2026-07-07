
import CreatePostClient from "./CreatePostClient";

export async function generateMetadata({ searchParams }) {
  const resolvedParams = await searchParams;
  const postId = resolvedParams?.postId;
  return {
    title: postId ? "Edit Post" : "Create Post",
    description: postId ? "Modify your community post." : "Compose and share a short post with the community.",
  };
}

export default function Page() {
  return <CreatePostClient />;
}
