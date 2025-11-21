// app/feed/page.js
"use client";

import { useState } from "react";
import Feed from "@components/posts/Feed";
import PostForm from "@components/posts/PostForm";

export default function FeedPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    // <main className="max-w-2xl mx-auto p-4">
    //   <h1 className="text-2xl font-bold mb-6">Feed</h1>

    //   {/* Toggleable Post Form */}
    //   {showForm ? (
    //     <div className="mb-6">
    //       <PostForm onClose={() => setShowForm(false)} />
    //     </div>
    //   ) : (
    //     <button
    //       onClick={() => setShowForm(true)}
    //       className="mb-6 w-full bg-blue-500 text-white py-2 px-4 rounded-full font-semibold hover:bg-blue-600 transition-colors"
    //     >
    //       Create Post
    //     </button>
    //   )}

    //   {/* Feed of posts */}
    //   <Feed />
    // </main>
    <></>
  );
}
