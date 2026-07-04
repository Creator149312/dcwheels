/**
 * lib/topicPageLogic.js
 *
 * Server-only module for fetching external content data and creating TopicPage docs.
 * Separated from lib/topicPage.js to handle heavyweight API clients (Anilist, TMDB)
 * without bloating the shared utility bundle.
 */

import { AniList } from "@spkrbox/anilist";
import TopicPage from "@/models/topicpage";
import { slugify } from "@utils/HelperFunctions";
import { rewriteAndPersist } from "./topicPage";

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const RAWG_BASE_URL = "https://api.rawg.io/api";

async function fetchAnimeFromAnilist(id) {
  const client = new AniList();
  return client.media.getById(id);
}

async function fetchCharacterFromAnilist(id) {
  const client = new AniList();
  return client.character.getById(id);
}

async function fetchMovieFromTMDb(id) {
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchGameById(gameId) {
  const res = await fetch(`${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Internal helper to generate seed ratings and worthIt counts based on external score
 * @param {number} S Normalized score (0-5)
 * @param {string} type Content type
 */
function generateSeedData(S, type) {
  if (type === "character") return {};

  const SEED_WEIGHT = 10;
  const rating = {
    totalScore: Math.round(S * SEED_WEIGHT * 10) / 10, // 1 decimal place
    count: SEED_WEIGHT,
  };

  let worthIt = { yes: 0, no: 0, meh: 0 };
  if (S >= 3.5) {
    worthIt.yes = SEED_WEIGHT;
  } else if (S >= 2.5) {
    worthIt.yes = 7;
    worthIt.no = 3;
  } else {
    worthIt.no = SEED_WEIGHT;
  }

  return { rating, worthIt };
}

export async function getOrCreateTopicPage(type, relatedId) {
  let pageDoc = await TopicPage.findOne({ type, relatedId }).lean();
  if (pageDoc) return pageDoc;

  let newDoc = null;

  if (type === "anime") {
    const media = await fetchAnimeFromAnilist(relatedId);
    if (!media) return null;
    const normalizedScore = media.averageScore ? media.averageScore / 20 : 3.0;
    const seed = generateSeedData(normalizedScore, "anime");
    newDoc = {
      type: "anime",
      source: "Anilist",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.title?.romaji || media.title?.english)}`,
      title: { romaji: media.title?.romaji, english: media.title?.english },
      cover: media.coverImage?.extraLarge || media.coverImage?.large,
      description: media.description?.replace(/<[^>]+>/g, "") || "",
      tags: (media.genres || []).map((g) => g.toLowerCase()),
      details: {
        studio: media.studios?.edges?.[0]?.node?.name || "",
        episodes: media.episodes,
        releaseYear: media.startDate?.year,
      },
      ...seed,
    };
  } else if (type === "movie" || type === "tv") {
    // TMDB handles both; simple branch here
    const media = await fetchMovieFromTMDb(relatedId);
    if (!media) return null;
    const normalizedScore = media.vote_average ? media.vote_average / 2 : 3.0;
    const seed = generateSeedData(normalizedScore, type);
    newDoc = {
      type,
      source: "TMDB",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.title || media.name)}`,
      title: { original: media.original_title || media.original_name, localized: media.title || media.name },
      cover: media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : "",
      description: media.overview || "",
      tags: (media.genres || []).map((g) => g.name.toLowerCase()),
      details: {
        runtime: media.runtime || media.episode_run_time?.[0],
        releaseYear: (media.release_date || media.first_air_date)?.split("-")[0],
      },
      ...seed,
    };
  } else if (type === "game") {
    const media = await fetchGameById(relatedId);
    if (!media) return null;
    const normalizedScore = media.rating || 3.0;
    const seed = generateSeedData(normalizedScore, "game");
    newDoc = {
      type: "game",
      source: "RAWG",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.name)}`,
      title: { default: media.name },
      cover: media.background_image || "",
      description: media.description_raw || "",
      tags: (media.genres || []).map((g) => g.name.toLowerCase()),
      details: {
        platform: (media.platforms || []).map((p) => p.platform?.name).join(", "),
        releaseYear: media.released?.split("-")[0],
      },
      ...seed,
    };
  } else if (type === "character") {
    const character = await fetchCharacterFromAnilist(relatedId);
    if (!character) return null;
    newDoc = {
      type: "character",
      source: "Anilist",
      relatedId: character.id,
      slug: `${character.id}-${slugify(character.name?.full || character.name?.native)}`,
      title: { english: character.name?.full },
      cover: character.image?.large || character.image?.medium,
      description: character.description?.replace(/<[^>]+>/g, "") || "",
      tags: (character.media?.nodes || []).map((m) => m?.title?.romaji?.toLowerCase()).filter(Boolean),
      details: {
        gender: character.gender || "",
        age: character.age || "",
        siteUrl: character.siteUrl || "",
      },
    };
  }

  if (!newDoc) return null;

  try {
    pageDoc = await TopicPage.create(newDoc);
    if (newDoc.description) {
      rewriteAndPersist(pageDoc._id, newDoc.description, type).catch(err => 
        console.error("rewriteAndPersist failed:", err)
      );
    }
  } catch (err) {
    if (err.code === 11000) {
      pageDoc = await TopicPage.findOne({ slug: newDoc.slug }).lean();
    } else {
      throw err;
    }
  }

  return pageDoc ? JSON.parse(JSON.stringify(pageDoc)) : null;
}
