// app/explore/page.js
//
// Discovery hub — modeled on music.youtube.com's Explore tab.
//
// Performance architecture:
//  - The shell (header, hero banner, mood chips, sort toggle) renders
//    instantly and is interactive.
//  - All heavy data (trending wheels, external entity rails, mood grid)
//    is fetched inside async server components wrapped in <Suspense> so
//    they stream in without blocking navigation.
//
// SearchParams:
//   ?mood=<slug>   — one of EXPLORE_MOODS slugs (default: "trending")
//   ?sort=recent   — overrides default sort order
//
// Caching: each data fetcher is wrapped in unstable_cache / fetch cache
// with long revalidation windows. The page itself is ISR'd.

import { Suspense } from "react";
import { EXPLORE_MOODS, getMoodBySlug } from "@data/exploreMoods";
import ExploreClient, {
  TrendingSkeleton,
  EntitySkeleton,
  GridSkeleton,
} from "./ExploreClient";
import TrendingSection from "./TrendingSection";
import EntitySection from "./EntitySection";
import GridSection from "./GridSection";

export const revalidate = 86400;

export const metadata = {
  title: "Explore Wheels — Trending, Moods & Categories | SpinPapa",
  description:
    "Discover trending spin wheels by mood and category. Party, food, decisions, couples, kids, games and more — find the perfect wheel in seconds.",
  openGraph: {
    title: "Explore Wheels by Mood & Category",
    description: "Trending wheels for every occasion. Party, food, decisions, games and more.",
    url: "/explore",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Wheels by Mood & Category",
    description: "Trending wheels for every occasion.",
  },
};

export default async function ExplorePage({ searchParams }) {
  const moodSlug = searchParams?.mood || "trending";
  const sort = searchParams?.sort === "recent" ? "recent" : "trending";
  const mood = getMoodBySlug(moodSlug);

  return (
    <ExploreClient
      moods={EXPLORE_MOODS}
      activeMood={mood.slug}
      activeSort={sort}
      trendingSlot={
        <Suspense fallback={<TrendingSkeleton />}>
          <TrendingSection />
        </Suspense>
      }
      entitySlot={
        <Suspense fallback={<EntitySkeleton />}>
          <EntitySection />
        </Suspense>
      }
      gridSlot={
        <Suspense fallback={<GridSkeleton />}>
          <GridSection mood={mood} sort={sort} />
        </Suspense>
      }
    />
  );
}
