// app/feed/page.js
//
// Feed is currently a stub — the actual feed UI is commented out pending a
// rewrite against the server-backed Post model. Until then this page ships
// as a pure static shell so it doesn't cost a serverless invocation or a
// client-side bundle when users wander in.
//
// When the feed is unstubbed, re-introduce `"use client"` in a leaf
// component (e.g. Feed.js) rather than at the page level so the page stays
// CDN-cacheable and only the interactive piece hydrates.

export const dynamic = "force-static";
export const revalidate = false;

export const metadata = {
  title: "Feed — SpinPapa",
  description: "Community feed for SpinPapa (coming soon).",
};

export default function FeedPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Feed</h1>
      <p className="text-gray-500 dark:text-gray-400">Coming soon.</p>
    </main>
  );
}
