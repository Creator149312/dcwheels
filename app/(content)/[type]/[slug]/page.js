import { AniList } from "@spkrbox/anilist";
import { OpenAI } from "openai";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import Question from "@models/question";
import Wheel from "@/models/wheel";
import TopicInteractionTabs from "@app/(content)/[type]/TopicInteractionTabs";
import TrailerPlayer from "@app/(content)/[type]/TrailerPlayer";
import WorthItVote from "@components/WorthItVote";
import AddToListButton from "@components/AddToListButton";
import apiConfig from "@utils/ApiUrlConfig";
import { slugify } from "@utils/HelperFunctions";
import AdaptiveLeaderBoardAds from "@components/ads/AdaptiveLeaderBoardAds";

const BASE_URL = apiConfig.baseUrl;

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = "https://api.rawg.io/api";

// ISR: re-render at most once per day. No session / no headers() usage in
// this Server Component, so Next.js can fully statically render and cache
// each content page at the CDN edge. Session-aware UI lives in
// TopicInteractionTabs (client) via useSession().
export const revalidate = 86400; // 1 day

// In-process OpenAI client — used for fire-and-forget description rewrites.
// Created lazily so the page module can still load at build time when the
// OPENAI_API_KEY is not set in the environment.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// --- External API Fetchers ---
async function fetchAnimeFromAnilist(id) {
  const client = new AniList();
  return client.media.getById(id);
}

//-- fetch Anime Characters using Anilist API --//
async function fetchCharacterFromAnilist(id) {
  const client = new AniList();
  return client.character.getById(id);
}

async function fetchMovieFromTMDb(id) {
  const apiKey = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchGameById(gameId) {
  const res = await fetch(
    `${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`
  );
  if (!res.ok) return null;
  return res.json();
}

// --- Trailer & Streaming Extras Fetchers ---
// These are fetched fresh on each request (not cached in DB) because
// streaming availability and trailer listings change frequently.
// Next.js ISR revalidation (86400 s = 24 h) prevents hammering external APIs.

/**
 * Fetches the YouTube trailer key and US streaming providers for a movie via TMDB.
 * Returns { trailerKey, streaming[], watchLink } where watchLink is the
 * JustWatch aggregated page for US providers.
 */
async function fetchMovieExtras(movieId) {
  const apiKey = process.env.TMDB_API_KEY;
  try {
    const [videosRes, providersRes] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=en-US`,
        { next: { revalidate: 86400 } }
      ),
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${apiKey}`,
        { next: { revalidate: 86400 } }
      ),
    ]);
    const videos = videosRes.ok ? await videosRes.json() : { results: [] };
    const providers = providersRes.ok ? await providersRes.json() : { results: {} };

    // Prefer an "official" YouTube trailer; fall back to any YouTube result
    const trailer =
      (videos.results || []).find((v) => v.type === "Trailer" && v.site === "YouTube") ||
      (videos.results || []).find((v) => v.site === "YouTube");

    // US flatrate/free/ad-supported providers (up to 6)
    const usProviders = providers.results?.US;
    const streaming = [
      ...(usProviders?.flatrate || []),
      ...(usProviders?.free || []),
      ...(usProviders?.ads || []),
    ].slice(0, 6);

    return {
      trailerKey: trailer?.key || null,
      // TMDB individual providers have no direct URL; use the JustWatch link
      streaming: streaming.map((p) => ({ ...p, url: usProviders?.link || null })),
      watchLink: usProviders?.link || null,
    };
  } catch {
    return { trailerKey: null, streaming: [], watchLink: null };
  }
}

/**
 * Fetches the YouTube trailer key and streaming links for an anime via AniList GraphQL.
 * Returns { trailerKey, streaming[] } where each streaming item has { url, site }.
 */
async function fetchAnimeExtras(animeId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        trailer { id site }
        externalLinks { url site type }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: animeId } }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { trailerKey: null, streaming: [] };
    const data = await res.json();
    const media = data.data?.Media;
    // AniList stores YouTube trailer id under trailer.id when site === "youtube"
    const trailerKey = media?.trailer?.site === "youtube" ? media.trailer.id : null;
    const streaming = (media?.externalLinks || [])
      .filter((l) => l.type === "STREAMING")
      .slice(0, 6);
    return { trailerKey, streaming };
  } catch {
    return { trailerKey: null, streaming: [] };
  }
}

/**
 * Fetches anime characters from AniList.
 * Returns { characters[] } where each character has { id, name, image }.
 * Limited to 12 characters, sorted by appearance role.
 */
async function fetchAnimeCharacters(animeId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        characters(sort: ROLE, perPage: 12) {
          nodes {
            id
            name { full }
            image { large }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: animeId } }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const characters = data.data?.Media?.characters?.nodes || [];
    return characters.filter((c) => c && c.name?.full && c.image?.large);
  } catch {
    return [];
  }
}

/**
 * Fetches store links for a game from RAWG.
 * The detail endpoint (/games/{id}) has store metadata (name, domain) but
 * its url fields are always empty. The sub-endpoint (/games/{id}/stores)
 * has the real purchase URLs but no metadata. Fetch both in parallel and
 * merge them by store_id so we get icons + working links.
 */
async function fetchGameExtras(gameId) {
  try {
    const [detailRes, storesRes] = await Promise.all([
      fetch(`${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`, { next: { revalidate: 86400 } }),
      fetch(`${RAWG_BASE_URL}/games/${gameId}/stores?key=${RAWG_API_KEY}`, { next: { revalidate: 86400 } }),
    ]);
    if (!detailRes.ok) return { trailerKey: null, streaming: [] };

    const detail = await detailRes.json();
    const storesData = storesRes.ok ? await storesRes.json() : { results: [] };

    // Build a map of store_id → purchase URL from the sub-endpoint
    const urlMap = {};
    for (const s of storesData.results || []) {
      urlMap[s.store_id] = s.url;
    }

    // Merge: detail gives store.name + store.domain, urlMap gives the real link
    const streaming = (detail.stores || []).slice(0, 6).map((s) => ({
      url: urlMap[s.store.id] || null,
      store: s.store, // { id, name, slug, domain }
    }));

    return { trailerKey: null, streaming };
  } catch {
    return { trailerKey: null, streaming: [] };
  }
}

/**
 * Fetches related TopicPages from MongoDB by overlapping tags.
 * Called directly (no HTTP round-trip) since this is a server component.
 * Excludes the current page and limits to 10 results sorted by tag overlap.
 */
async function getRelatedPages(tags, currentId) {
  if (!tags?.length) return [];
  try {
    return TopicPage.aggregate([
      { $match: { tags: { $in: tags }, _id: { $ne: currentId } } },
      {
        $addFields: {
          overlapCount: {
            $size: {
              $filter: { input: "$tags", as: "t", cond: { $in: ["$$t", tags] } },
            },
          },
        },
      },
      { $sort: { overlapCount: -1, createdAt: -1 } },
      { $limit: 10 },
      { $project: { title: 1, cover: 1, slug: 1, type: 1 } },
    ]);
  } catch {
    return [];
  }
}

// Tiered wheel discovery for a TopicPage.
//
// 1. PRIMARY — wheels explicitly linked via `relatedTopics` (multikey index
//    on {type, id}). These are the most semantically correct matches: the
//    wheel author (or admin) picked this exact entity. A "GTA or Need for
//    Speed Picker" will show up on BOTH the GTA and the Need for Speed
//    TopicPages because it has two entries in relatedTopics.
//
// 2. FALLBACK — tag-overlap aggregation fills any remaining slots up to
//    the limit. This catches older wheels that were never explicitly
//    linked but share genre tags, and any wheel whose author didn't pick
//    a topic at save time. Excludes wheels already returned by the
//    primary pass so there are no duplicates.
async function fetchTaggedWheels(tags, relatedId, type) {
  const LIMIT = 20;
  const PROJECTION = "_id title description wheelPreview createdAt";

  try {
    // Primary: explicit relatedTopics match. Do NOT filter on wheelPreview
    // here — an explicit topic link is the strongest signal we have, so we
    // show the wheel even if its preview image hasn't been generated yet
    // (the card just renders a placeholder). Only the tag-overlap fallback
    // below keeps the preview filter, because there "no preview" often
    // correlates with a half-baked wheel.
    const direct = await Wheel.find({
      relatedTopics: { $elemMatch: { type, id: String(relatedId) } },
    })
      .select(PROJECTION)
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean();

    if (direct.length >= LIMIT || !tags?.length) return direct;

    // Fallback: tag-overlap, excluding wheels we already have.
    const excludeIds = direct.map((w) => w._id);
    const fallback = await Wheel.aggregate([
      {
        $match: {
          tags: { $in: tags },
          wheelPreview: { $ne: null },
          _id: { $nin: excludeIds },
        },
      },
      {
        $addFields: {
          overlapCount: {
            $size: {
              $filter: { input: "$tags", as: "t", cond: { $in: ["$$t", tags] } },
            },
          },
        },
      },
      { $sort: { overlapCount: -1, createdAt: -1 } },
      { $limit: LIMIT - direct.length },
      { $project: { _id: 1, title: 1, description: 1, wheelPreview: 1, createdAt: 1 } },
    ]);

    return [...direct, ...fallback];
  } catch {
    return [];
  }
}

function extractId(param) {
  const id = parseInt(param.split("-")[0], 10);
  return isNaN(id) ? null : id;
}

// lib/getOrCreateTopicPage.js
export async function getOrCreateTopicPage(type, relatedId) {
  let pageDoc = await TopicPage.findOne({ type, relatedId }).lean();
  if (pageDoc) return pageDoc;

  let media;
  let newDoc;

  if (type === "anime") {
    media = await fetchAnimeFromAnilist(relatedId);
    if (!media) return null;

    const rawDescription = media.description?.replace(/<[^>]+>/g, "") || "";

    newDoc = {
      type: "anime",
      source: "Anilist",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.title.romaji || media.title.english)}`,
      title: media.title,
      cover: media.coverImage?.extraLarge || media.coverImage?.large,
      description: rawDescription,
      tags: (media.genres || [])
        .map((g) => (g ? g.toLowerCase() : null))
        .filter(Boolean),
      details: {
        studio: media.studios?.edges?.[0]?.node?.name || "",
        episodes: media.episodes,
        releaseYear: media.startDate?.year,
      },
    };
  } else if (type === "movie") {
    media = await fetchMovieFromTMDb(relatedId);
    if (!media) return null;

    const rawDescription = media.overview || "";

    newDoc = {
      type: "movie",
      source: "TMDB",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.title)}`,
      title: { original: media.original_title, localized: media.title },
      cover: media.poster_path
        ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
        : "",
      description: rawDescription,
      tags: (media.genres || []).map((g) => g.name.toLowerCase()),
      details: {
        runtime: media.runtime,
        releaseYear: media.release_date
          ? parseInt(media.release_date.split("-")[0])
          : null,
      },
    };
  } else if (type === "game") {
    media = await fetchGameById(relatedId);
    if (!media) return null;

    const rawDescription = media.description_raw || "";

    newDoc = {
      type: "game",
      source: "RAWG",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.name)}`,
      title: { default: media.name },
      cover: media.background_image || "",
      description: rawDescription,
      tags: (media.genres || []).map((g) => g.name.toLowerCase()),
      details: {
        platform: (media.platforms || [])
          .map((p) => p.platform?.name)
          .join(", "),
        releaseYear: media.released
          ? parseInt(media.released.split("-")[0])
          : null,
      },
    };
  } else if (type === "character") {
    const character = await fetchCharacterFromAnilist(relatedId);
    if (!character) return null;

    // Strip HTML tags from AniList description
    const rawDescription = character.description?.replace(/<[^>]+>/g, "") || "";

    // Prefer English-friendly name if available
    newDoc = {
      type: "character",
      source: "Anilist",
      relatedId: character.id,
      slug: `${character.id}-${slugify(
        character.name?.full || character.name?.native
      )}`,
      title: {
        english: character.name?.full,
        // alternative: character.name?.alternative?.[0],
        // native: character.name?.native || "",
      },
      cover: character.image?.large || character.image?.medium,
      description: rawDescription,
      tags: (character.media?.nodes || [])
        .map((m) => m?.title?.romaji?.toLowerCase())
        .filter(Boolean),
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

    // Seed starter questions for the new page so it doesn't look empty.
    // Idempotency: questions are only inserted on the initial create path,
    // so re-visiting an existing page never duplicates them.
    // SYSTEM_USER_ID must be a valid ObjectId in your users collection.
    const systemUserId = process.env.SYSTEM_USER_ID;
    if (systemUserId) {
      const seedQuestions = {
        movie:     ["Worth watching?", "Better than the hype?", "Would you recommend it?"],
        anime:     ["Worth watching?", "Better than the hype?", "Would you recommend it?"],
        game:      ["Worth the full price?", "Better than the hype?", "Would you buy it again?"],
        character: ["Best character in the series?", "Would you want them as an ally?", "Fan favourite?"],
      };
      const texts = seedQuestions[type] || [];
      if (texts.length) {
        await Question.insertMany(
          texts.map((text) => ({
            type: "yesno",
            text,
            contentType: type,
            contentId: pageDoc._id,
            options: ["Yes", "No"],
            likes: [],
            createdBy: systemUserId,
          }))
        );
      }
    }

    // Fire-and-forget description rewrite. The first visitor sees the raw
    // external description (Anilist/TMDB/RAWG); by the time a second visitor
    // arrives, the rewritten SEO-friendly version is persisted. Saves ~3-8s
    // off the first render without giving up the uniqueness benefit.
    if (openai && newDoc.description) {
      rewriteAndPersist(pageDoc._id, newDoc.description, type).catch((err) =>
        console.error("rewriteAndPersist failed:", err)
      );
    }
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — another request created it just now
      pageDoc = await TopicPage.findOne({ slug: newDoc.slug }).lean();
    } else {
      console.log("I have an error");
      throw err;
    }
  }

  return pageDoc?.toObject?.() || pageDoc || null;
}

/**
 * Background rewrite — called fire-and-forget after a TopicPage is created.
 * Runs OpenAI directly in-process (no HTTP self-call) and updates the doc.
 * Errors are swallowed so a failed rewrite never breaks anything for users.
 */
async function rewriteAndPersist(topicPageId, originalText, type) {
  if (!openai || !originalText) return;
  const prompt = `Rewrite the following ${type} description in a casual descriptive way in 100 words. Make it sound unique and engaging:\n\n"${originalText}"`;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });
    const rewritten = response.choices?.[0]?.message?.content?.trim();
    if (rewritten) {
      await TopicPage.updateOne(
        { _id: topicPageId },
        { $set: { description: rewritten } }
      );
    }
  } catch (err) {
    console.error("OpenAI rewrite failed:", err);
  }
}

export async function generateMetadata({ params }) {
  const { type, slug } = params;
  const relatedId = extractId(slug);
  if (!relatedId)
    return { title: "Not Found", description: "Content not found." };

  await connectMongoDB();
  const pageDoc = await getOrCreateTopicPage(type, relatedId);
  if (!pageDoc)
    return { title: "Not Found", description: "Content not found." };

  const title =
    pageDoc.title?.default ||
    pageDoc.title?.english ||
    pageDoc.title?.romaji ||
    pageDoc.title?.localized ||
    pageDoc.title?.original ||
    "Untitled";

  const description =
    pageDoc.description?.slice(0, 160) ||
    "Explore details and community-generated wheels.";
  const image = pageDoc.cover || `${BASE_URL}/default-cover.jpg`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      url: `${BASE_URL}/${type}/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

// --- Generic Dynamic Page ---
//
// IMPORTANT: Do NOT call getServerSession(), headers(), or cookies() here.
// Any request-scoped API would force this page off the static render path
// and defeat the `revalidate` CDN cache above. Session state is resolved
// on the client inside TopicInteractionTabs via useSession().
export default async function TopicPageDetail({ params }) {
  const { type, slug } = params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  await connectMongoDB();
  const pageDoc = await getOrCreateTopicPage(type, relatedId);
  let media;
  if (!pageDoc) {
    return <div>Not found</div>;
  } else {
    // Use existing DB entry only
    media = pageDoc;
  }

  // Fetch trailer/streaming extras, related pages, tagged wheels, and characters in parallel
  // to minimise total server latency on first load.
  const [extras, relatedPages, taggedWheels, animeCharacters] = await Promise.all([
    type === "movie"
      ? fetchMovieExtras(relatedId)
      : type === "anime"
      ? fetchAnimeExtras(relatedId)
      : type === "game"
      ? fetchGameExtras(relatedId)
      : Promise.resolve({ trailerKey: null, streaming: [] }),
    getRelatedPages(pageDoc.tags || [], pageDoc._id),
    fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, type),
    type === "anime" ? fetchAnimeCharacters(relatedId) : Promise.resolve([]),
  ]);

  // Resolve the display title once — referenced in hero, meta, and actions
  const displayTitle =
    pageDoc.title?.default ||
    pageDoc.title?.english ||
    pageDoc.title?.romaji ||
    pageDoc.title?.localized ||
    pageDoc.title?.original ||
    pageDoc.name?.full ||
    "Untitled";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white">

      {/* ── Mobile hero (< sm): Option B plain layout ──────────────────────
           No backdrop, no gradient.
           [poster 88px] | [title + CTA button]
           [scrollable meta pills]
           [description (3-line clamp)]
           [Worth It? vote]
           [Where to Watch]                                                  */}
      <div className="sm:hidden px-4 pt-6 pb-6">

        {/* Row 1: poster + title / CTA */}
        <div className="flex gap-4 items-start">
          {pageDoc.cover && (
            <img
              src={pageDoc.cover}
              alt={displayTitle}
              className="w-[120px] flex-shrink-0 rounded-xl shadow-lg aspect-[3/4] object-cover"
            />
          )}
          <div className="flex flex-col gap-3 min-w-0 pt-1">
            <h1 className="text-xl font-bold leading-tight text-gray-900 dark:text-white">
              {displayTitle}
            </h1>
            <AddToListButton
              type={type}
              entityId={String(pageDoc._id)}
              name={displayTitle}
              slug={pageDoc.slug}
              image={pageDoc.cover}
            />
          </div>
        </div>

        {/* Row 2: horizontally scrollable meta pills */}
        <div
          className="flex gap-2 mt-4 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {pageDoc.details?.releaseYear && (
            <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1">
              {pageDoc.details.releaseYear}
            </span>
          )}
          {type === "anime" && pageDoc.details?.episodes && (
            <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1">
              {pageDoc.details.episodes} eps
            </span>
          )}
          {type === "movie" && pageDoc.details?.runtime && (
            <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1">
              {pageDoc.details.runtime} min
            </span>
          )}
          {type === "game" && pageDoc.details?.platform && (
            <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1 max-w-[180px] truncate">
              {pageDoc.details.platform.split(",")[0].trim()}
            </span>
          )}
          {pageDoc.tags?.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/75 rounded-full px-3 py-1 capitalize"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Row 3: description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-4 line-clamp-3">
          {pageDoc.description}
        </p>

        {/* Row 4: Worth It? vote (light bg) */}
        <div className="mt-5">
          <WorthItVote
            topicPageId={String(pageDoc._id)}
            type={type}
            initialYes={pageDoc.worthIt?.yes ?? 0}
            initialNo={pageDoc.worthIt?.no ?? 0}
          />
        </div>

        {/* Row 5: Where to Watch */}
        {extras?.streaming?.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              {type === "game" ? "Available On" : "Where to Watch"}
            </p>
            <div className="flex flex-wrap gap-2">
              {extras.streaming.map((provider, i) => (
                <a
                  key={i}
                  href={provider.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white text-xs font-medium rounded-full px-3 py-1.5 transition-colors"
                >
                  {/* TMDB providers have logo_path; RAWG stores expose store.domain */}
                  {(provider.logo_path || provider.store?.domain) && (
                    <img
                      src={provider.logo_path
                        ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                        : `https://www.google.com/s2/favicons?domain=${provider.store.domain}&sz=32`
                      }
                      alt=""
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                    />
                  )}
                  {provider.provider_name ||
                    provider.site ||
                    provider.store?.name ||
                    provider.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop hero (sm+): plain surface, no backdrop, no gradient ──────
           Intentionally no blurred cover or gradient — looks clean in both
           light and dark mode. Poster left, info right (same as mobile but
           larger). Title and CTA share one row at 80/20.                   */}
      <div className="hidden sm:block max-w-5xl mx-auto px-6 pt-10 pb-12">
        <div className="flex gap-10 items-start">

          {/* Poster */}
          {pageDoc.cover && (
            <img
              src={pageDoc.cover}
              alt={displayTitle}
              className="w-52 flex-shrink-0 rounded-xl shadow-lg aspect-[3/4] object-cover"
            />
          )}

          {/* Info column */}
          <div className="flex-1 min-w-0">

            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-white mb-4">
              {displayTitle}
            </h1>

            <AddToListButton
              type={type}
              entityId={String(pageDoc._id)}
              name={displayTitle}
              slug={pageDoc.slug}
              image={pageDoc.cover}
            />

            {/* Meta pills */}
            <div
              className="flex gap-2 mt-4 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {pageDoc.details?.releaseYear && (
                <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1">
                  {pageDoc.details.releaseYear}
                </span>
              )}
              {type === "anime" && pageDoc.details?.episodes && (
                <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1">
                  {pageDoc.details.episodes} eps
                </span>
              )}
              {type === "movie" && pageDoc.details?.runtime && (
                <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1">
                  {pageDoc.details.runtime} min
                </span>
              )}
              {type === "game" && pageDoc.details?.platform && (
                <span className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-full px-3 py-1 max-w-[180px] truncate">
                  {pageDoc.details.platform.split(",")[0].trim()}
                </span>
              )}
              {pageDoc.tags?.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="flex-shrink-0 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/75 rounded-full px-3 py-1 capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-4 mb-5">
              {pageDoc.description}
            </p>

            {/* Worth It? vote */}
            <WorthItVote
              topicPageId={String(pageDoc._id)}
              type={type}
              initialYes={pageDoc.worthIt?.yes ?? 0}
              initialNo={pageDoc.worthIt?.no ?? 0}
            />

            {/* Where to Watch */}
            {extras?.streaming?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  {type === "game" ? "Available On" : "Where to Watch"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {extras.streaming.map((provider, i) => (
                    <a
                      key={i}
                      href={provider.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white text-xs font-medium rounded-full px-3 py-1.5 transition-colors"
                    >
                      {/* TMDB providers have logo_path; RAWG stores expose store.domain */}
                      {(provider.logo_path || provider.store?.domain) && (
                        <img
                          src={provider.logo_path
                            ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                            : `https://www.google.com/s2/favicons?domain=${provider.store.domain}&sz=32`
                          }
                          alt=""
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                        />
                      )}
                      {provider.provider_name ||
                        provider.site ||
                        provider.store?.name ||
                        provider.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Ad: horizontal leaderboard ──────────────────────────────────────
           Placed directly below the hero — highest-engagement position.
           Same AdSense publisher + slots used across the rest of the site.
           AdaptiveLeaderBoardAds swaps 728×90 ↔ 320×50 based on viewport. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <AdaptiveLeaderBoardAds
          desktopSlot="2668822790"
          mobileSlot="8451962089"
        />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────
           Max-width container keeps content readable on wide screens.       */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        {/* ── Trailer ─────────────────────────────────────────────────────
             TrailerPlayer is a client component that renders a thumbnail
             with a play button. The <iframe> is only injected on click,
             preventing the YouTube embed script from blocking page load.    */}
        {extras?.trailerKey && (
          <section>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-blue-600 inline-block" aria-hidden="true" />
              Trailer
            </h2>
            <TrailerPlayer trailerKey={extras.trailerKey} title={displayTitle} />
          </section>
        )}

        {/* ── Picker Wheels / Community Votes / Quick Takes ───────────────
             These are SpinPapa's moat — nobody else surfaces community
             spin wheels or decision-focused Q&A per content item.          */}
        <TopicInteractionTabs
          type={type}
          pageId={pageDoc._id}
          contentId={relatedId.toString()}
          contentSlug={pageDoc.slug}
          contentTags={pageDoc.tags || []}
          taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
          animeCharacters={type === "anime" ? animeCharacters : []}
        />

        {/* ── You Might Also Like ─────────────────────────────────────────
             Related content by overlapping tags, horizontal scroll row.    */}
        {relatedPages?.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-blue-600 inline-block" aria-hidden="true" />
              You Might Also Like
            </h2>
            <div
              className="flex overflow-x-auto gap-4 pb-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {relatedPages.map((related) => {
                const relatedTitle =
                  related.title?.default ||
                  related.title?.english ||
                  related.title?.romaji ||
                  related.title?.localized ||
                  related.title?.original ||
                  "Untitled";
                return (
                  <a
                    key={String(related._id)}
                    href={`/${related.type}/${related.slug}`}
                    className="group flex-shrink-0 w-28 sm:w-32 block"
                  >
                    <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2 aspect-[3/4] group-hover:scale-105 transition-transform duration-200">
                      {related.cover ? (
                        <img
                          src={related.cover}
                          alt={relatedTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-gray-400">No image</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold truncate group-hover:text-blue-600 transition-colors">
                      {relatedTitle}
                    </p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{related.type}</p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
