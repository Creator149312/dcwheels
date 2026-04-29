// app/wheels/page.js
import WheelsClient from "./WheelClient";
import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";
import "@models/wheel";

// Public listing — safe to cache at the CDN for a few minutes. No session,
// no cookies, no per-user data. This route previously did an internal HTTP
// fetch to /api/page/all with `cache: "no-store"` which turned every visit
// into an origin round-trip + DB query. We now query the DB directly in
// the Server Component and let Next.js ISR handle caching.
export const revalidate = 120; // 2 minutes — matches /api/page/all

export const metadata = {
  title: "All Wheels",
  description: "Browse all wheels created across the platform.",
  openGraph: {
    title: "All Wheels",
    description: "Explore user-created wheels.",
    url: "/wheels",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Wheels",
    description: "Explore user-created wheels.",
  },
};

async function getInitialWheels(limit = 20, skip = 0) {
  await connectMongoDB();
  // Project only the fields the listing card needs. Without `.select()`, every
  // Page doc shipped its full content/contentBlocks/data payload over the wire
  // just to render a title + slug + preview thumbnail.
  const rows = await Page.find({})
    .select("title slug createdAt updatedAt wheel")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("wheel", "wheelPreview")
    .lean();

  return rows.map((w) => ({
    _id: w._id.toString(),
    title: w.title,
    slug: w.slug,
    wheelPreview: w.wheel?.wheelPreview || null,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));
}

export default async function WheelsPage() {
  let wheels = [];
  try {
    wheels = await getInitialWheels();
  } catch (err) {
    console.error("WheelsPage initial load failed:", err);
  }

  return <WheelsClient initialWheels={wheels} />;
}
