import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";
import { unstable_cache } from "next/cache";
import { slugify } from "@utils/HelperFunctions";
import {
  fetchGames,
  fetchAnime,
  fetchMovies,
} from "@app/(content)/[type]/TopicPagesHelperFunctions";

const TRENDING_LIMIT = 8;
const GRID_LIMIT = 24;
const ENTITY_RAIL_LIMIT = 10;

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

  const games =
    gamesRes.status === "fulfilled"
      ? normalizeGames(gamesRes.value || [])
      : [];
  const anime =
    animeRes.status === "fulfilled"
      ? normalizeAnime(animeRes.value || [])
      : [];
  const movies =
    moviesRes.status === "fulfilled"
      ? normalizeMovies(moviesRes.value || [])
      : [];

  [gamesRes, animeRes, moviesRes].forEach((r, i) => {
    if (r.status === "rejected") {
      const labels = ["games", "anime", "movies"];
      // eslint-disable-next-line no-console
      console.error(`ExplorePage ${labels[i]} fetch failed:`, r.reason);
    }
  });

  return { games, anime, movies };
}
