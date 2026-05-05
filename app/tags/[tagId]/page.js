import { notFound, redirect } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";
import Tag from "@models/tag";
import { getWheelsByTag, getAsksByTag, getTagSpaceStats, resolveTagSlug } from "@components/actions/actions";
import TagSpaceClient from "@components/TagSpaceClient";
import FollowButton from "@components/FollowButton";
import Link from "next/link";
import { Hash, Layers, MessageCircleQuestion } from "lucide-react";

// Tags with fewer wheels than this threshold are served with noindex so
// Google skips thin pages, but the page still renders — users clicking
// tag links from wheel pages always land on a real page, never a 404.
// Only isPublic:false (admin-controlled) triggers a hard 404.
const NOINDEX_BELOW = 3;

// Tag pages rarely change — cache aggressively.
export const revalidate = 21600; // 6 hours

// Pre-render the top 100 public tag pages at build time.
// Prefers Tag collection slugs (canonical); falls back to raw Wheel.tags.
export async function generateStaticParams() {
  try {
    await connectMongoDB();

    // Hero tier: registered canonical tags that are public and have content
    const canonicalTags = await Tag.find({ isPublic: true })
      .sort({ wheelCount: -1 })
      .limit(100)
      .select("slug")
      .lean();

    if (canonicalTags.length > 0) {
      return canonicalTags.map((t) => ({ tagId: t.slug }));
    }

    // Fallback: Tag collection not yet seeded — use raw Wheel.tags
    const top = await Wheel.aggregate([
      { $match: { tags: { $exists: true, $ne: [] } } },
      { $unwind: "$tags" },
      { $project: { tag: { $toLower: "$tags" } } },
      { $group: { _id: "$tag", n: { $sum: 1 } } },
      { $match: { n: { $gte: NOINDEX_BELOW } } },
      { $sort: { n: -1 } },
      { $limit: 100 },
    ]);
    return top.filter((t) => t._id).map((t) => ({ tagId: t._id }));
  } catch (err) {
    console.error("generateStaticParams (tags) failed:", err);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const tagId = decodeURIComponent(params.tagId);
  await connectMongoDB();
  const { canonical, tagDoc } = await resolveTagSlug(tagId);
  const display = tagDoc?.displayName ||
    canonical.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const description = tagDoc?.description ||
    `Explore spin wheels and community dilemmas about "${display}" on Spinpapa.`;
  // Count wheels to decide noindex for thin tags
  const wheelCount = tagDoc?.wheelCount ??
    await Wheel.countDocuments({ tags: canonical });
  const isThin = wheelCount < NOINDEX_BELOW;

  return {
    title: `${display} Space – Spin Wheels & Dilemmas`,
    description,
    alternates: tagDoc && tagDoc.slug !== tagId.toLowerCase()
      ? { canonical: `/tags/${tagDoc.slug}` }
      : undefined,
    // Thin tags: tell Google to skip but don't break user-facing links.
    robots: isThin ? { index: false, follow: true } : undefined,
  };
}

export default async function TagDetailPage({ params }) {
  const tagId = decodeURIComponent(params.tagId);
  await connectMongoDB();

  // Resolve alias → canonical. If the URL contains an alias slug, 301
  // redirect to the canonical URL so PageRank consolidates.
  const { canonical, tagDoc } = await resolveTagSlug(tagId);
  if (tagDoc && canonical !== tagId.toLowerCase()) {
    redirect(`/tags/${canonical}`);
  }

  // isPublic:false is the ONLY hard 404 — admin blocks spam tags this way.
  // Count-based thin tags still render but carry noindex (set in generateMetadata).
  if (tagDoc && !tagDoc.isPublic) return notFound();

  const display = tagDoc?.displayName ||
    canonical.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Fetch everything in parallel
  const [initialWheels, initialAsks, stats] = await Promise.all([
    getWheelsByTag(canonical, { limit: 20, skip: 0 }),
    getAsksByTag(canonical, { limit: 12, skip: 0 }),
    getTagSpaceStats(canonical),
  ]);

  // Truly empty tags (no wheels at all) → 404. This only happens if someone
  // manually navigates to a tag URL that exists in zero wheels.
  if (!initialWheels || initialWheels.length === 0) {
    return notFound();
  }

  // Serialize _id to string so client components can use it as key
  const wheelsData = initialWheels.map((w) => ({
    ...w,
    _id: String(w._id),
  }));
  const asksData = initialAsks.map((a) => ({
    ...a,
    _id: String(a._id),
    userId: a.userId ? String(a.userId) : undefined,
    options: (a.options || []).map((o) => ({
      ...o,
      id: o._id ? String(o._id) : String(o.id),
    })),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20 min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="pt-6 pb-5 mb-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600 mb-4">
          <Link href="/tags" className="hover:text-indigo-500 transition-colors">
            All Spaces
          </Link>
          <span>/</span>
          <span className="text-gray-600 dark:text-gray-400">{display}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
                <span className="text-white font-black text-base">
                  {display.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight">
                  {display}{" "}
                  <span className="text-indigo-500">Space</span>
                </h1>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              Spin wheels, community dilemmas, and everything{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">#{tagId}</span> in one place.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <FollowButton
              entityType="tag"
              entityId={canonical}
              labelFollow="Follow Space"
              labelFollowing="Following"
              className="text-xs px-3 py-2"
            />
            <Link
              href={`/ask/create?q=&opts=&from=${encodeURIComponent(tagId)}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-full transition-colors shadow-sm shrink-0"
            >
              <MessageCircleQuestion size={14} />
              Ask a Dilemma
            </Link>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800/40">
            <Layers size={13} className="text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {stats.wheelCount.toLocaleString()} {stats.wheelCount === 1 ? "Wheel" : "Wheels"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-full border border-purple-100 dark:border-purple-800/40">
            <MessageCircleQuestion size={13} className="text-purple-500" />
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
              {stats.askCount.toLocaleString()} Active {stats.askCount === 1 ? "Dilemma" : "Dilemmas"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-800">
            <Hash size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{tagId}</span>
          </div>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 dark:border-gray-800 mb-2" />

      {/* ── Tabbed content ───────────────────────────────────────────── */}
      <TagSpaceClient
        tagId={tagId}
        initialWheels={wheelsData}
        initialAsks={asksData}
      />
    </div>
  );
}

