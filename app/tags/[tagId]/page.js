import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";
import Post from "@models/post";
import UnifiedList from "@models/unifiedlist";
import Tag from "@models/tag";
import { getFeedItems } from "@/lib/feedService";
import { getTagSpaceStats, resolveTagSlug } from "@components/actions/actions";
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
export const revalidate = 86400; // 1 day

// Pre-render the top 100 public tag pages at build time.
// Prefers Tag collection slugs (canonical); falls back to raw Wheel.tags.
export async function generateStaticParams() {
  try {
    await connectMongoDB();

    // Hero tier: registered canonical tags that are public and have content
    const canonicalTags = await Tag.find({ isPublic: true })
      .sort({ wheelCount: -1, askCount: -1, listCount: -1 })
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
  // Count total content to decide noindex for thin tags
  const totalCount = tagDoc 
    ? (tagDoc.wheelCount || 0) + (tagDoc.askCount || 0) + (tagDoc.listCount || 0)
    : await (async () => {
        const [w, a, l] = await Promise.all([
          Wheel.countDocuments({ tags: canonical, isPublic: true, isDeleted: false }),
          Post.countDocuments({ tags: canonical, isPublic: true, isDeleted: false, shadowBanned: false }),
          UnifiedList.countDocuments({ tags: canonical, isSystem: false, $or: [{ "settings.visibility": "public" }, { isPublic: true }] })
        ]);
        return w + a + l;
      })();
  
  const isThin = totalCount < NOINDEX_BELOW;

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
    getFeedItems({ 
      tag: canonical, 
      limit: 21,
      docType: "post,wheel"
    }),
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
    <div className="max-w-3xl mx-auto px-0 md:px-0 py-3 md:py-6 pb-20 min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-0 pb-3 mb-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground/60 mb-3">
          <Link href="/tags" className="hover:text-primary transition-colors">
            All Spaces
          </Link>
          <span>/</span>
          <span className="text-muted-foreground">{display}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
                <span className="text-primary-foreground font-black text-base md:text-lg">
                  {display.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-foreground leading-tight truncate">
                {display}{" "}
                <span className="text-primary">Space</span>
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-xl">
              {tagDoc?.description
                ? tagDoc.description
                : <>Decision picker wheels, community discussions, and everything{" "}
                    <span className="font-medium text-foreground">#{tagId}</span> in one place.
                  </>}
            </p>
          </div>


        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted/50 rounded-full border border-border">
            <Layers size={11} className="text-primary" />
            <span className="text-[10px] font-semibold text-foreground">
              {stats.wheelCount.toLocaleString()} {stats.wheelCount === 1 ? "Wheel" : "Wheels"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-full border border-border">
            <Hash size={10} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">{tagId}</span>
          </div>
        </div>
      </div>

      {/* ── Community Feed ───────────────────────────────────────────── */}
      <section className="mt-2">
        <TagSpaceClient
          tagId={canonical}
          initialItems={initialItems}
          initialNextCursor={initialNextCursor}
          docType="post,wheel"
        />
      </section>
    </div>
  );
}

