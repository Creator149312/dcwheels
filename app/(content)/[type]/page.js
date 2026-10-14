import { Suspense } from "react";
import CategorySpotlightRail from "./CategorySpotlightRail";
import CategoryCommunityFeed from "./CategoryCommunityFeed";
import { getCachedSpotlight } from "./getCategorySpotlight";
import { getFeedItemsSafe } from "@/lib/feedService";
import { SpotlightRailSkeleton } from "./loading";
import { FeedSkeleton } from "@app/(content)/_shared/SuspendedSections";
import CreatePostTeaser from "@components/CreatePostTeaser";

const VALID_TYPES = ["anime", "movie", "game", "character"];

export async function generateMetadata({ params }) {
  const { type } = await params;

  const typeLabels = {
    anime: "Anime",
    movie: "Movies",
    game: "Gaming",
    character: "Characters",
  };

  const typeDescriptions = {
    anime:
      "Join the Anime community on Spinpapa. Discover trending anime, vote on polls, discuss hot takes, and spin themed wheels.",
    movie:
      "Explore trending movies, share reviews, vote in community polls, and spin themed wheels for your next watch party.",
    game:
      "Discover what's trending in gaming right now, join debates, vote on tier lists, and create wheels for your next gaming session.",
    character:
      "Explore iconic characters, celebrate fan favorites, debate matchups, and spin custom character wheels.",
  };

  const label = typeLabels[type] || "Community Hub";
  const description =
    typeDescriptions[type] ||
    "Explore curated content, community discussions, and custom wheels.";

  return {
    title: `${label}`,
    description,
  };
}

// Pre-render the main content listing pages at build time.
export async function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

// ---------- Suspended Sections ----------
const SPOTLIGHT_TITLES = {
  anime: "Popular Anime Communities",
  movie: "Trending Movies This Week",
  game: "Popular Gaming Hubs",
  character: "Fan-Favorite Characters",
};

async function SuspendedSpotlightRail({ spotlightPromise, type }) {
  const spotlightItems = await spotlightPromise;
  return (
    <CategorySpotlightRail
      title={SPOTLIGHT_TITLES[type] || "Popular Communities"}
      items={spotlightItems}
      type={type}
    />
  );
}

async function SuspendedCategoryFeed({ feedPromise, type, tag }) {
  const FEED_PAGE_SIZE = 8;
  const allFeedItems = (await feedPromise) || [];

  const feedItems = allFeedItems.slice(0, FEED_PAGE_SIZE);
  const nextItem =
    allFeedItems.slice(FEED_PAGE_SIZE).find((i) => (i._docType || i.docType) !== "list") ||
    null;
  const hasList = feedItems.some((i) => i.docType === "list" || i._docType === "list");
  const initialFeedCursor = nextItem
    ? `${nextItem.hotScore ?? nextItem.createdAt}|${nextItem._id || nextItem.id}|${hasList ? 1 : 0}`
    : null;

  const initialFeedItems = JSON.parse(JSON.stringify(feedItems));

  return (
    <CategoryCommunityFeed
      type={type}
      initialFeedItems={initialFeedItems}
      initialFeedCursor={initialFeedCursor}
      activeTag={tag}
      hideComposer
    />
  );
}

// ---------- Main Category Page ----------
export default async function TopicListPage({ params, searchParams }) {
  const { type } = await params;
  const resolvedSearchParams = await searchParams;
  const tag = resolvedSearchParams?.tag || "";

  // Kick off Spotlight and Feed fetches concurrently as Promises for Suspense streaming
  const spotlightPromise = getCachedSpotlight(type);
  const feedPromise = getFeedItemsSafe({
    type,
    tag: tag || null,
    docType: "post,wheel,list",
    limit: 9,
  });

  return (
    <div className="mx-auto max-w-2xl px-0 py-2 sm:py-6">
      {/* ── Compact Spotlight Rail (Streamed) ──────────────────────── */}
      <div className="px-3 sm:px-0">
        <Suspense fallback={<SpotlightRailSkeleton />}>
          <SuspendedSpotlightRail spotlightPromise={spotlightPromise} type={type} />
        </Suspense>
      </div>

      {/* ── Immediate In-Feed Composer ─────────────────────────────── */}
      <div className="mb-4">
        <CreatePostTeaser
          defaultTag={tag || type}
          className="shadow-sm"
        />
      </div>

      {/* ── Infinite Feed Stream (Streamed) ────────────────────────── */}
      <Suspense fallback={<FeedSkeleton />}>
        <SuspendedCategoryFeed feedPromise={feedPromise} type={type} tag={tag} />
      </Suspense>
    </div>
  );
}
