import { redirect } from "next/navigation";
import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import Tag from "@models/tag";
import { getFeedItems } from "@/lib/feedService";
import { resolveTagSlug } from "@components/actions/actions";
import TagSpaceClient from "@components/TagSpaceClient";

// React.cache() deduplicates resolveTagSlug between generateMetadata and the
// page body — without this every cold render (ISR miss or first visit) fires
// the same slug-lookup aggregation twice against MongoDB.
const getCachedTagSlug = cache((tagId) => resolveTagSlug(tagId));
import Link from "next/link";

// Tags with fewer wheels than this threshold are served with noindex so
// Google skips thin pages, but the page still renders — users clicking
// tag links from wheel pages always land on a real page, never a 404.
// Only isPublic:false (admin-controlled) triggers a hard 404.
const NOINDEX_BELOW = 3;

// Tag pages rarely change — cache aggressively.
export const revalidate = 86400; // 1 day

// Pre-render only the seasonal tags surfaced by TagsCarousel.
// All other tag pages render on-demand with ISR.
export async function generateStaticParams() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;

    // Seasonal tag names from TagsCarousel
    const seasonalNames = new Set([
      "new-year",
      "valentines",
      "ipl",
      "cricket",
      "fifa",
      "summer",
      "back-to-school",
      "halloween",
      "thanksgiving",
      "black-friday",
      "christmas",
    ]);

    const currentSeasonal = {
      1: ["new-year"],
      2: ["valentines"],
      3: ["ipl", "cricket"],
      4: ["ipl", "cricket"],
      5: ["ipl"],
      6: ["fifa", "summer"],
      7: ["summer"],
      8: ["back-to-school"],
      9: ["back-to-school"],
      10: ["halloween"],
      11: ["thanksgiving", "black-friday"],
      12: ["christmas", "new-year"],
    }[month];

    if (currentSeasonal) {
      currentSeasonal.forEach((t) => seasonalNames.add(t));
    }

    await connectMongoDB();
    const tags = await Tag.find({ slug: { $in: Array.from(seasonalNames) } })
      .select("slug")
      .lean();

    return tags.map((t) => ({ tagId: t.slug }));
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

  // SEO guard: skip indexing thin or unregistered tags. Rely on the Tag
  // document's denormalized counts; don't run expensive countDocuments
  // queries for unregistered tags — just treat them as thin.
  const totalCount = tagDoc
    ? (tagDoc.wheelCount || 0) + (tagDoc.askCount || 0) + (tagDoc.listCount || 0)
    : 0;
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

  // NOTE: We've removed the hard 404 for isPublic: false to ensure common tags 
  // without this field don't break. Spam is now handled via noindex 
  // logic in generateMetadata.

  const display = tagDoc?.displayName ||
    canonical.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Unified feed logic
  const FEED_PAGE_SIZE = 8;
  let initialItems = [];
  let initialNextCursor = null;
  try {
    const initialData = await getFeedItems({
      tag: canonical,
      limit: FEED_PAGE_SIZE + 1,
      docType: "post,wheel"
    });
    initialItems = initialData.slice(0, FEED_PAGE_SIZE);
    const nextItem = initialData.length > FEED_PAGE_SIZE ? initialData[FEED_PAGE_SIZE] : null;
    initialNextCursor = nextItem ? `${nextItem.createdAt}|${nextItem._id || nextItem.id}` : null;
  } catch (err) {
    console.error(`Tag feed error for "${canonical}":`, err);
    // Degrade gracefully: render the tag space with an empty feed so users
    // can still create the first post/wheel even if the feed query fails.
  }

  // Truly empty tags (zero content in DB) AND no registered tagDoc → render tag space with empty state instead of hard 404
  // so users navigating to a new/unseeded tag can still view the space and create the first post.
  // Hard 404 is only kept if tagDoc is explicitly disabled/soft-deleted if configured.

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

