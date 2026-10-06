import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";
import TopicPage from "@models/topicpage";
import { unstable_cache } from "next/cache";
import { slugify } from "@utils/HelperFunctions";
import {
  fetchGames,
  fetchAnime,
  fetchMovies,
} from "@app/(content)/[type]/TopicPagesHelperFunctions";
import { isCleanText, isTopicDocSafe } from "@/lib/contentSafety";

function formatTopicPage(p) {
  return {
    id: `${p.type}-${p.relatedId}`,
    href: `/${p.type}/${p.slug}`,
    title:
      p.title?.default ||
      p.title?.english ||
      p.title?.romaji ||
      p.title?.localized ||
      "Topic",
    image: p.cover,
    subtitle: p.details?.releaseYear
      ? String(p.details.releaseYear)
      : p.details?.episodes
      ? `${p.details.episodes} eps`
      : null,
  };
}

async function fetchTopicPageFallback({ type, limit }) {
  try {
    await connectMongoDB();
    const pages = await TopicPage.find({
      type,
      cover: { $exists: true, $ne: null },
      slug: { $exists: true, $ne: null },
    })
      .sort({ wheels: -1, updatedAt: -1 })
      .limit(limit * 2)
      .select("title slug type cover relatedId details wheels tags description")
      .lean();
    return pages.filter(isTopicDocSafe).slice(0, limit).map(formatTopicPage);
  } catch (err) {
    console.error(`[fetchTopicPageFallback ${type}] failed:`, err);
    return [];
  }
}

const TRENDING_LIMIT = 8;
const GRID_LIMIT = 24;
const ENTITY_RAIL_LIMIT = 10;

function normalizeGames(games = []) {
  return games
    .filter((g) => {
      const isAdultEsrb = g.esrb_rating?.slug === "adults-only";
      const hasAdultTag = (g.tags || []).some((t) => {
        const name = (t.name || "").toLowerCase();
        return name === "nsfw" || name === "sexual content" || name === "erotic" || name === "hentai";
      });
      return !isAdultEsrb && !hasAdultTag && isCleanText(g.name) && isCleanText(g.slug);
    })
    .slice(0, ENTITY_RAIL_LIMIT)
    .map((g) => ({
      id: `game-${g.id}`,
      href: `/game/${g.id}-${g.slug}`,
      title: g.name,
      image: g.background_image,
      subtitle: g.released?.slice(0, 4) || null,
    }));
}

function normalizeAnime(anime = []) {
  return anime
    .filter((a) => !a.isAdult)
    .map((a) => {
      const title = a.title?.english || a.title?.romaji || "Untitled";
      return {
        id: `anime-${a.id}`,
        href: `/anime/${a.id}-${slugify(title)}`,
        title,
        image: a.coverImage?.large,
        subtitle: a.startDate?.year ? String(a.startDate.year) : null,
      };
    })
    .filter((a) => isCleanText(a.title) && isCleanText(a.href))
    .slice(0, ENTITY_RAIL_LIMIT);
}

function normalizeMovies(movies = []) {
  return movies
    .filter((m) => !m.adult && isCleanText(m.title))
    .slice(0, ENTITY_RAIL_LIMIT)
    .map((m) => ({
      id: `movie-${m.id}`,
      href: `/movie/${m.id}-${slugify(m.title)}`,
      title: m.title,
      image: m.poster_path
        ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
        : null,
      subtitle: m.release_date?.slice(0, 4) || null,
    }));
}

const _fetchPagesByTagsUncached = async ({
  tags = [],
  limit = GRID_LIMIT,
  sort = "trending",
}) => {
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

export const fetchPagesByTags = unstable_cache(
  _fetchPagesByTagsUncached,
  ["explore-fetch-pages-by-tags"],
  { revalidate: 1800, tags: ["explore", "wheels-list"] }
);

export async function fetchExploreTrending() {
  const rows = await fetchPagesByTags({
    tags: [],
    limit: TRENDING_LIMIT,
    sort: "trending",
  });
  return rows;
}

export async function fetchExploreGrid({ tags, sort }) {
  const rows = await fetchPagesByTags({ tags, limit: GRID_LIMIT, sort });
  return rows;
}

export async function fetchExploreEntities() {
  const [gamesRes, animeRes, moviesRes] = await Promise.allSettled([
    fetchGames({ page: 1, page_size: ENTITY_RAIL_LIMIT }),
    fetchAnime({ page: 1, perPage: ENTITY_RAIL_LIMIT, sort: "POPULARITY_DESC" }),
    fetchMovies({ page: 1 }),
  ]);

  let games =
    gamesRes.status === "fulfilled"
      ? normalizeGames(gamesRes.value || [])
      : [];
  let anime =
    animeRes.status === "fulfilled"
      ? normalizeAnime(animeRes.value || [])
      : [];
  let movies =
    moviesRes.status === "fulfilled"
      ? normalizeMovies(moviesRes.value || [])
      : [];

  // If any external API comes back empty/failed, backfill from our local
  // TopicPage collection so the rails never stay empty.
  const [fallbackGames, fallbackAnime, fallbackMovies] = await Promise.all([
    games.length === 0 ? fetchTopicPageFallback({ type: "game", limit: ENTITY_RAIL_LIMIT }) : [],
    anime.length === 0 ? fetchTopicPageFallback({ type: "anime", limit: ENTITY_RAIL_LIMIT }) : [],
    movies.length === 0 ? fetchTopicPageFallback({ type: "movie", limit: ENTITY_RAIL_LIMIT }) : [],
  ]);

  games = games.length > 0 ? games : fallbackGames;
  anime = anime.length > 0 ? anime : fallbackAnime;
  movies = movies.length > 0 ? movies : fallbackMovies;

  [gamesRes, animeRes, moviesRes].forEach((r, i) => {
    if (r.status === "rejected") {
      const labels = ["games", "anime", "movies"];
      // eslint-disable-next-line no-console
      console.error(`ExplorePage ${labels[i]} fetch failed:`, r.reason);
    }
  });

  return { games, anime, movies };
}
