import CategorySpotlightRail from "./CategorySpotlightRail";
import CategoryCommunityFeed from "./CategoryCommunityFeed";
import { getCachedSpotlight } from "./getCategorySpotlight";
import { getFeedItemsSafe } from "@/lib/feedService";

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

// ---------- Main Category Page ----------
export default async function TopicListPage({ params, searchParams }) {
  const { type } = await params;
  const resolvedSearchParams = await searchParams;
  const tag = resolvedSearchParams?.tag || "";

  const typeTitles = {
    anime: "Anime",
    movie: "Movies",
    game: "Gaming",
    character: "Characters",
  };

  // Fetch Top 4 Spotlight for the compact rail
  const spotlightItems = await getCachedSpotlight(type);

  // Fetch initial category-filtered feed (Posts + Wheels)
  const FEED_PAGE_SIZE = 8;
  const allFeedItems = await getFeedItemsSafe({
    type,
    tag: tag || null,
    docType: "post,wheel",
    limit: FEED_PAGE_SIZE + 1,
  });

  const feedItems = allFeedItems.slice(0, FEED_PAGE_SIZE);
  const nextItem =
    allFeedItems.slice(FEED_PAGE_SIZE).find((i) => (i._docType || i.docType) !== "list") ||
    null;
  const hasList = feedItems.some((i) => i.docType === "list" || i._docType === "list");
  const initialFeedCursor = nextItem
    ? `${nextItem.createdAt}|${nextItem._id || nextItem.id}|${hasList ? 1 : 0}`
    : null;

  const initialFeedItems = JSON.parse(JSON.stringify(feedItems));

  return (
    <div className="mx-auto max-w-2xl px-0 py-2 sm:py-6">
      {/* ── Compact Spotlight Rail ─────────────────────────────────── */}
      <div className="px-3 sm:px-0">
        <CategorySpotlightRail
          title={`Top ${type === "movie" ? "Movies" : type === "game" ? "Games" : type === "anime" ? "Anime" : "Characters"} This Week`}
          items={spotlightItems}
          type={type}
        />
      </div>

      {/* ── Feed Stream (Composer + Infinite Stream) ───────────────── */}
      <CategoryCommunityFeed
        type={type}
        initialFeedItems={initialFeedItems}
        initialFeedCursor={initialFeedCursor}
        activeTag={tag}
      />
    </div>
  );
}
