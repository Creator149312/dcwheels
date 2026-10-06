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
import { rewriteAndPersist, fetchWithTimeout } from "./topicPage";
import { isCleanText, isTopicDocSafe } from "@/lib/contentSafety";

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const RAWG_BASE_URL = "https://api.rawg.io/api";

async function fetchAnimeFromAnilist(id) {
  const client = new AniList();
  const media = await client.media.getById(id);
  // Upstream API safety check: AniList explicitly flags adult content via isAdult
  if (!media || media.isAdult) {
    if (media?.isAdult) {
      console.warn(`[ContentSafety] AniList API flagged media ${id} as adult (isAdult: true).`);
    }
    return null;
  }
  return media;
}

async function fetchCharacterFromAnilist(id) {
  const client = new AniList();
  return client.character.getById(id);
}

async function fetchTMDbMedia(type, id, attempt = 1) {
  // TMDB uses separate endpoints for movies and TV shows.
  const endpoint = type === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${TMDB_API_KEY}&language=en-US`;
  try {
    const res = await fetchWithTimeout(url, {}, 12000);
    if (!res.ok) {
      if (res.status >= 500 && attempt < 3) {
        // Retry on server errors after a short delay
        await new Promise((r) => setTimeout(r, 500 * attempt));
        return fetchTMDbMedia(type, id, attempt + 1);
      }
      return null;
    }
    const data = await res.json();
    // Upstream API safety check: TMDB explicitly flags adult movies/shows via adult boolean
    if (!data || data.adult) {
      if (data?.adult) {
        console.warn(`[ContentSafety] TMDB API flagged ${type}/${id} as adult (adult: true).`);
      }
      return null;
    }
    return data;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchTMDbMedia(type, id, attempt + 1);
    }
    console.warn(`fetchTMDbMedia (${type}/${id}) failed:`, err.message);
    return null;
  }
}

async function fetchGameById(gameId, attempt = 1) {
  const url = `${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`;
  try {
    const res = await fetchWithTimeout(url, {}, 10000);
    if (!res.ok) {
      if (res.status >= 500 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        return fetchGameById(gameId, attempt + 1);
      }
      return null;
    }
    const data = await res.json();
    // Upstream API safety check: RAWG flags adult games via tags ("NSFW", "Sexual Content", "Nudity") or ESRB Adults Only
    if (data) {
      const isAdultEsrb = data.esrb_rating?.slug === "adults-only";
      const hasAdultTag = (data.tags || []).some((t) => {
        const name = (t.name || "").toLowerCase();
        return name === "nsfw" || name === "sexual content" || name === "erotic" || name === "hentai";
      });
      if (isAdultEsrb || hasAdultTag) {
        console.warn(`[ContentSafety] RAWG API flagged game ${gameId} as adult (esrb: ${data.esrb_rating?.slug}, tags: ${hasAdultTag}).`);
        return null;
      }
    }
    return data;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchGameById(gameId, attempt + 1);
    }
    console.warn(`fetchGameById (${gameId}) failed:`, err.message);
    return null;
  }
}

/**
 * Internal helper to generate seed ratings and worthIt counts based on external score
 * 
 * Aligns with user rating thresholds:
 *   4-5 stars (S >= 4.0) → "Yes" (Worth It)
 *   3-4 stars (S >= 3.0) → "Meh" with Yes bias
 *   2-3 stars (S >= 2.0) → "Meh" with No bias
 *   1-2 stars (S < 2.0)  → "No" (Skip It)
 * 
 * @param {number} S Normalized score (0-5)
 * @param {string} type Content type
 */
function generateSeedData(S, type) {
  if (type === "character") return {};

  const SEED_WEIGHT = 10;
  // If no score is provided by API, we should NOT seed a fake 3.0.
  // We should either return empty or a very minimal weight to let users decide.
  if (!S || S === 3.0) {
     return { 
       rating: { totalScore: 0, count: 0 }, 
       worthIt: { yes: 0, no: 0, meh: 0 } 
     };
  }

  const rating = {
    totalScore: Math.round(S * SEED_WEIGHT * 10) / 10, // 1 decimal place
    count: SEED_WEIGHT,
  };

  let worthIt = { yes: 0, no: 0, meh: 0 };
  
  // Align with rating-to-vote thresholds for consistency
  if (S >= 4.0) {
    // Excellent (4-5 stars equivalent)
    worthIt.yes = SEED_WEIGHT;
  } else if (S >= 3.0) {
    // Good-Average (3-4 stars equivalent) - slight yes bias
    worthIt.yes = 7;
    worthIt.meh = 3;
  } else if (S >= 2.0) {
    // Poor-Average (2-3 stars equivalent) - slight no bias
    worthIt.no = 7;
    worthIt.meh = 3;
  } else {
    // Very Poor (1-2 stars equivalent)
    worthIt.no = SEED_WEIGHT;
  }

  return { rating, worthIt };
}

const TOPIC_PAGE_PROJECTION =
  "type source relatedId slug title cover description tags details rating worthIt wheels createdAt updatedAt";

export async function getOrCreateTopicPage(type, relatedId) {
  let pageDoc = await TopicPage.findOne({ type, relatedId })
    .select(TOPIC_PAGE_PROJECTION)
    .lean();

  if (pageDoc) {
    // Screen existing DB records: if an adult/prohibited topic was stored previously,
    // block serving it and treat it as not found.
    if (!isTopicDocSafe(pageDoc)) {
      console.warn(`[ContentSafety] Blocked existing adult/prohibited TopicPage in DB (${type}/${relatedId}): ${pageDoc.slug}`);
      return null;
    }
    return pageDoc;
  }

  let newDoc = null;

  if (type === "anime") {
    const media = await fetchAnimeFromAnilist(relatedId);
    if (!media) return null;
    // Anilist averageScore is 0-100. If null, we don't normalize it to 3.0.
    const normalizedScore = media.averageScore ? media.averageScore / 20 : null;
    const seed = generateSeedData(normalizedScore, "anime");
    const animeTitleEnglish = media.title?.english;
    const animeTitleRomaji = media.title?.romaji;
    newDoc = {
      type: "anime",
      source: "Anilist",
      relatedId: media.id,
      slug: `${media.id}-${slugify(animeTitleRomaji || animeTitleEnglish)}`,
      title: {
        default: animeTitleEnglish || animeTitleRomaji,
        romaji: animeTitleRomaji,
        english: animeTitleEnglish,
      },
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
    const media = await fetchTMDbMedia(type, relatedId);
    if (!media) return null;
    const normalizedScore = media.vote_average ? (media.vote_average / 2) : null; // TMDB is 0-10
    const seed = generateSeedData(normalizedScore, type);
    const tmdbLocalized = media.title || media.name;
    const tmdbOriginal = media.original_title || media.original_name;
    newDoc = {
      type,
      source: "TMDB",
      relatedId: media.id,
      slug: `${media.id}-${slugify(tmdbLocalized)}`,
      title: {
        default: tmdbLocalized || tmdbOriginal,
        localized: tmdbLocalized,
        original: tmdbOriginal,
      },
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
    // RAWG rating is 0-5. metamorphic to metacritic (0-100) if rating is missing
    const rawScore = media.rating || (media.metacritic ? media.metacritic / 20 : null);
    const seed = generateSeedData(rawScore, "game");
    newDoc = {
      type: "game",
      source: "RAWG",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.name)}`,
      title: { default: media.name || "" },
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
    const characterName = character.name?.full || character.name?.native;
    newDoc = {
      type: "character",
      source: "Anilist",
      relatedId: character.id,
      slug: `${character.id}-${slugify(character.name?.full || character.name?.native)}`,
      title: { default: characterName, english: character.name?.full },
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

  // Tier 1 Content Safety & Policy Gate:
  // Reject titles, descriptions, slugs, or tags with adult / prohibited content
  if (!isTopicDocSafe(newDoc)) {
    console.warn(`[ContentSafety] Blocked adult/prohibited TopicPage (${type}/${relatedId}): ${newDoc.slug}`);
    return null;
  }

  try {
    pageDoc = await TopicPage.create(newDoc);
    if (newDoc.description) {
      rewriteAndPersist(pageDoc._id, newDoc.description, type).catch(err => 
        console.error("rewriteAndPersist failed:", err)
      );
    }
  } catch (err) {
    if (err.code === 11000) {
      pageDoc = await TopicPage.findOne({ slug: newDoc.slug })
        .select(TOPIC_PAGE_PROJECTION)
        .lean();
    } else {
      throw err;
    }
  }

  return pageDoc ? JSON.parse(JSON.stringify(pageDoc)) : null;
}
