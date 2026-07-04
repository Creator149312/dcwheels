/**
 * app/(content)/movie/[slug]/page.js
 *
 * Movie content pages — ISR, 1-day revalidation.
 *
 * Only TMDB imports live here. @spkrbox/anilist and RAWG fetchers are
 * absent from this bundle entirely — they only exist in anime/ and game/.
 */

import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import { slugify } from "@utils/HelperFunctions";
import { getFeedItems } from "@/lib/feedService";
import {
  extractId,
  resolveTitle,
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
  fetchTaggedWheels,
  rewriteAndPersist,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

export const revalidate = 86400; // 1 day

// ---------------------------------------------------------------------------
// TMDB fetchers (movie-only)
// ---------------------------------------------------------------------------

async function fetchMovieFromTMDb(id) {
  const apiKey = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchMovieFromTMDb error:", err.message);
    return null;
  }
}

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

    const trailer =
      (videos.results || []).find((v) => v.type === "Trailer" && v.site === "YouTube") ||
      (videos.results || []).find((v) => v.site === "YouTube");

    const usProviders = providers.results?.US;
    const streaming = [
      ...(usProviders?.flatrate || []),
      ...(usProviders?.free || []),
      ...(usProviders?.ads || []),
    ]
      .slice(0, 6)
      .map((p) => ({ ...p, url: usProviders?.link || null }));

    return { trailerKey: trailer?.key || null, streaming };
  } catch {
    return { trailerKey: null, streaming: [] };
  }
}

async function fetchMovieCharacters(movieId) {
  const apiKey = process.env.TMDB_API_KEY;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.cast || [])
      .slice(0, 12)
      .filter((c) => c.profile_path && c.name);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// DB upsert (movie-only branch, no type switching)
// ---------------------------------------------------------------------------

async function getOrCreateMoviePage(relatedId) {
  let pageDoc = await TopicPage.findOne({ type: "movie", relatedId }).lean();
  if (pageDoc) return pageDoc;

  const media = await fetchMovieFromTMDb(relatedId);
  if (!media) return null;

  const rawDescription = media.overview || "";

  const newDoc = {
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

  try {
    pageDoc = await TopicPage.create(newDoc);
    if (newDoc.description) {
      rewriteAndPersist(pageDoc._id, newDoc.description, "movie").catch((err) =>
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

// React.cache() deduplicates between generateMetadata and the page body.
const getCachedMoviePage = cache(async (relatedId) => {
  await connectMongoDB();
  return getOrCreateMoviePage(relatedId);
});

// ---------------------------------------------------------------------------
// Next.js exports
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found", description: "Content not found." };

  const pageDoc = await getCachedMoviePage(relatedId);
  if (!pageDoc) return { title: "Not Found", description: "Content not found." };

  return buildPageMetadata("movie", slug, pageDoc);
}

export default async function MoviePage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedMoviePage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  const [extras, relatedPages, taggedWheels, movieCharacters, feedData] = await Promise.all([
    fetchMovieExtras(relatedId),
    getRelatedPages(pageDoc.tags || [], pageDoc._id),
    fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "movie"),
    fetchMovieCharacters(relatedId),
    getFeedItems({ 
      type: "movie", 
      externalId: String(relatedId),
      limit: 9 
    }),
  ]);

  return (
    <TopicPageContentWrapper>
      <TopicPageLayout
        type="movie"
        pageDoc={pageDoc}
        extras={extras}
        relatedPages={JSON.parse(JSON.stringify(relatedPages))}
        taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
        animeCharacters={[]} // Cast carousel disabled for movies for now
        displayTitle={displayTitle}
        affiliateLinks={buildAffiliateLinks("movie", displayTitle)}
        relatedId={relatedId}
        initialFeed={JSON.parse(JSON.stringify(feedData.slice(0, 8)))}
        initialCursor={feedData.length > 8 ? JSON.parse(JSON.stringify(feedData[7].createdAt)) : null}
      />
    </TopicPageContentWrapper>
  );
}
