// app/explore/page.js
//
// Discovery hub — modeled on music.youtube.com's Explore tab. Two zones:
//
//   1. Trending strip   — top wheels by composite score (likes + recency)
//   2. Mood-filtered grid — curated chips filter the catalog by tag set
//
// Both data sets are server-fetched via the Page model (so every link
// resolves to the SEO-friendly /wheels/[slug] route) with `wheel`
// populated for tags and likeCount used in ranking.
//
// SearchParams:
//   ?mood=<slug>   — one of EXPLORE_MOODS slugs (default: "trending")
//   ?sort=recent   — overrides default sort order
//
// Caching: this is a public, per-searchParam page. Next.js will treat
// the searchParams as part of the cache key so each mood combo gets its
// own ISR entry.

import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";
import "@models/wheel";
import { unstable_cache } from "next/cache";
import { EXPLORE_MOODS, getMoodBySlug } from "@data/exploreMoods";
import {
  fetchGames,
  fetchAnime,
  fetchMovies,
} from "@app/(content)/[type]/TopicPagesHelperFunctions";
import { slugify } from "@utils/HelperFunctions";
import ExploreClient from "./ExploreClient";

// Page-level ISR: trending/popular rankings don't move minute-to-minute,
// so a 30-min window cuts cold renders ~6× vs. a 5-min window with no
// noticeable UX impact. Each ?mood=<slug> combo gets its own cache entry.
export const revalidate = 3600;

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

const TRENDING_LIMIT = 8;
const GRID_LIMIT = 24;
const ENTITY_RAIL_LIMIT = 10;

/**
 * Normalize entity payloads from RAWG / AniList / TMDB into a single
 * shape the rail component understands. Keeping this on the server side
 * means the client bundle never sees the raw API field jungle.
 */
function normalizeGames(games = []) {
  return games.slice(0, ENTITY_RAIL_LIMIT).map((g) => ({
    id: `game-${g.id}`,
    href: `/game/${g.id}-${g.slug}`,
    title: g.name,
    image: g.background_image,
    subtitle: g.released?.slice(0, 4) || null,
  }));
}

function normalizeAnime(anime = []) {
  return anime.slice(0, ENTITY_RAIL_LIMIT).map((a) => {
    const title = a.title?.english || a.title?.romaji || "Untitled";
    return {
      id: `anime-${a.id}`,
      href: `/anime/${a.id}-${slugify(title)}`,
      title,
      image: a.coverImage?.large,
      subtitle: a.startDate?.year ? String(a.startDate.year) : null,
    };
  });
}

function normalizeMovies(movies = []) {
  return movies.slice(0, ENTITY_RAIL_LIMIT).map((m) => ({
    id: `movie-${m.id}`,
    href: `/movie/${m.id}-${slugify(m.title)}`,
    title: m.title,
    image: m.poster_path
      ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
      : null,
    subtitle: m.release_date?.slice(0, 4) || null,
  }));
}

/**
 * Resolve a list of Page documents matching an optional tag filter,
 * sorted by trending score (likeCount desc, then recency).
 *
 * Implementation notes
 * --------------------
 *  - We aggregate on Page (not Wheel) so the result naturally carries
 *    the SEO slug — every Explore card resolves to /wheels/[slug].
 *  - $lookup → $unwind on `wheel` lets us filter/sort by Wheel.tags
 *    and Wheel.likeCount in a single pipeline.
 *  - When `tags` is empty we skip the $match (the array filter would
 *    otherwise reject every doc since `$in []` is always false).
 *  - Wrapped in `unstable_cache` so that within the revalidate window,
 *    repeat ISR fills (e.g. user toggling between moods, edge eviction)
 *    serve from Next's data cache instead of re-running the aggregation.
 *    Cache key is the function arguments — different mood/sort combos
 *    get isolated cache entries.
 */
const _fetchPagesByTagsUncached = async ({ tags = [], limit = GRID_LIMIT, sort = "trending" }) => {
  await connectMongoDB();

  const pipeline = [
    {
      $lookup: {
        from: "wheels",
        localField: "wheel",
        foreignField: "_id",
        as: "wheel",
      },
    },
    { $unwind: { path: "$wheel", preserveNullAndEmptyArrays: false } },
  ];

  if (tags.length > 0) {
    pipeline.push({ $match: { "wheel.tags": { $in: tags } } });
  }

  // Trending = denormalized likeCount as primary signal + recency tie-break.
  // Once spin/view tracking is wired up we can fold those in here too.
  const sortStage =
    sort === "recent"
      ? { createdAt: -1 }
      : { "wheel.likeCount": -1, createdAt: -1 };
  pipeline.push({ $sort: sortStage });
  pipeline.push({ $limit: limit });
  pipeline.push({
    $project: {
      _id: 1,
      title: 1,
      slug: 1,
      createdAt: 1,
      "wheel._id": 1,
      "wheel.wheelPreview": 1,
      "wheel.tags": 1,
      "wheel.likeCount": 1,
    },
  });

  const rows = await Page.aggregate(pipeline);

  return rows.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    createdAt: p.createdAt,
    wheelPreview: p.wheel?.wheelPreview || null,
    tags: p.wheel?.tags || [],
    likeCount: p.wheel?.likeCount || 0,
  }));
};

const fetchPagesByTags = unstable_cache(
  _fetchPagesByTagsUncached,
  ["explore-fetch-pages-by-tags"],
  { revalidate: 1800, tags: ["explore", "wheels-list"] }
);

export default async function ExplorePage({ searchParams }) {
  const moodSlug = searchParams?.mood || "trending";
  const sort = searchParams?.sort === "recent" ? "recent" : "trending";
  const mood = getMoodBySlug(moodSlug);

  let trending = [];
  let gridItems = [];
  let games = [];
  let anime = [];
  let movies = [];

  try {
    // Trending strip is always global (mood-agnostic) — it's the
    // "what's hot right now" rail at the top of the page.
    //
    // External entity fetches (games/anime/movies) hit RAWG/AniList/TMDB
    // and are wrapped in unstable_cache / Next data cache inside the
    // helper functions, so repeat ISR fills won't burn quota. Run them
    // in parallel with the Mongo aggregations to keep TTFB flat.
    const [
      trendingRes,
      gridRes,
      gamesRes,
      animeRes,
      moviesRes,
    ] = await Promise.allSettled([
      fetchPagesByTags({ tags: [], limit: TRENDING_LIMIT, sort: "trending" }),
      fetchPagesByTags({ tags: mood.tags, limit: GRID_LIMIT, sort }),
      fetchGames({ page: 1, page_size: ENTITY_RAIL_LIMIT }),
      fetchAnime({ page: 1, perPage: ENTITY_RAIL_LIMIT, sort: "POPULARITY_DESC" }),
      fetchMovies({ page: 1 }),
    ]);

    if (trendingRes.status === "fulfilled") trending = trendingRes.value;
    if (gridRes.status === "fulfilled") gridItems = gridRes.value;
    if (gamesRes.status === "fulfilled") games = normalizeGames(gamesRes.value);
    if (animeRes.status === "fulfilled") anime = normalizeAnime(animeRes.value);
    if (moviesRes.status === "fulfilled") movies = normalizeMovies(moviesRes.value);

    // Surface partial failures in logs without breaking the page render.
    [trendingRes, gridRes, gamesRes, animeRes, moviesRes].forEach((r, i) => {
      if (r.status === "rejected") {
        const labels = ["trending", "grid", "games", "anime", "movies"];
        console.error(`ExplorePage ${labels[i]} fetch failed:`, r.reason);
      }
    });
  } catch (err) {
    console.error("ExplorePage data fetch failed:", err);
  }

  return (
    <ExploreClient
      moods={EXPLORE_MOODS}
      activeMood={mood.slug}
      activeSort={sort}
      trending={trending}
      gridItems={gridItems}
      games={games}
      anime={anime}
      movies={movies}
    />
  );
}
