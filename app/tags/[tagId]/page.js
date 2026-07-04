import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";
import Tag from "@models/tag";
import { getUnifiedTagFeed, getTagSpaceStats, resolveTagSlug } from "@components/actions/actions";
import TagSpaceClient from "@components/TagSpaceClient";

// React.cache() deduplicates resolveTagSlug between generateMetadata and the
// page body — without this every cold render (ISR miss or first visit) fires
// the same slug-lookup aggregation twice against MongoDB.
const getCachedTagSlug = cache((tagId) => resolveTagSlug(tagId));
import Link from "next/link";
import { Hash, Layers } from "lucide-react";

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
  const { canonical, tagDoc } = await getCachedTagSlug(tagId);
  const display = tagDoc?.displayName ||
    canonical.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const description = tagDoc?.description ||
    `Explore Decision wheels and community dilemmas about "${display}" on Spinpapa.`;
  // Count wheels to decide noindex for thin tags
  const wheelCount = tagDoc?.wheelCount ??
    await Wheel.countDocuments({ tags: canonical });
  const isThin = wheelCount < NOINDEX_BELOW;

  return {
    title: `${display} Space – Decision Wheels & Dilemmas`,
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
  const { canonical, tagDoc } = await getCachedTagSlug(tagId);
  if (tagDoc && canonical !== tagId.toLowerCase()) {
    redirect(`/tags/${canonical}`);
  }

  // isPublic:false is the ONLY hard 404 — admin blocks spam tags this way.
  // Count-based thin tags still render but carry noindex (set in generateMetadata).
  if (tagDoc && !tagDoc.isPublic) return notFound();

  const display = tagDoc?.displayName ||
    canonical.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Unified feed logic
  const [initialData, stats] = await Promise.all([
    getUnifiedTagFeed(canonical, { limit: 21 }), // Fetch 21 to get cursor for 20
    getTagSpaceStats(canonical),
  ]);

  const initialItems = initialData.slice(0, 20);
  const initialNextCursor = initialData.length > 20 ? initialData[19].createdAt : null;

  // Truly empty tags (zero content in DB) → 404. Admin-blocked tags → 404.
  // We only hard-404 when there's absolutely nothing to show AND the tag isn't
  // a registered public tag (a registered public tag may exist but have no content yet).
  if ((!initialItems || initialItems.length === 0) && !tagDoc) {
    return notFound();
  }

  // Wider feed column to better match modern social layouts on desktop.
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 py-6 pb-20 min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="pb-5 mb-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mb-4">
          <Link href="/tags" className="hover:text-primary transition-colors">
            All Spaces
          </Link>
          <span>/</span>
          <span className="text-muted-foreground">{display}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
                <span className="text-primary-foreground font-black text-lg md:text-xl">
                  {display.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight truncate">
                {display}{" "}
                <span className="text-primary">Space</span>
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">
              {tagDoc?.description
                ? tagDoc.description
                : <>Decision picker wheels, community discussions, and everything{" "}
                    <span className="font-medium text-foreground">#{tagId}</span> in one place.
                  </>}
            </p>
          </div>


        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border">
            <Layers size={13} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {stats.wheelCount.toLocaleString()} {stats.wheelCount === 1 ? "Wheel" : "Wheels"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full border border-border">
            <Hash size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">{tagId}</span>
          </div>
        </div>
      </div>

      {/* ── Community Feed ───────────────────────────────────────────── */}
      <section>
        <TagSpaceClient
          tagId={canonical}
          initialItems={initialItems}
          initialNextCursor={initialNextCursor}
        />
      </section>
    </div>
  );
}

