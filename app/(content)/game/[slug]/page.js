/**
 * app/(content)/game/[slug]/page.js
 *
 * Game content pages — ISR, 1-day revalidation (store/streaming data changes).
 *
 * Only RAWG fetch calls live here. No AniList, no TMDB in this bundle.
 */

import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import { slugify } from "@utils/HelperFunctions";
import {
  extractId,
  resolveTitle,
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
  fetchTaggedWheels,
  rewriteAndPersist,
} from "@lib/topicPage";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

export const revalidate = 86400; // 1 day

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = "https://api.rawg.io/api";

// ---------------------------------------------------------------------------
// RAWG fetchers (game-only)
// ---------------------------------------------------------------------------

async function fetchGameById(gameId) {
  const res = await fetch(
    `${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`
  );
  if (!res.ok) return null;
  return res.json();
}

async function fetchGameExtras(gameId) {
  try {
    const [detailRes, storesRes] = await Promise.all([
      fetch(`${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`, {
        next: { revalidate: 86400 },
      }),
      fetch(`${RAWG_BASE_URL}/games/${gameId}/stores?key=${RAWG_API_KEY}`, {
        next: { revalidate: 86400 },
      }),
    ]);
    if (!detailRes.ok) return { trailerKey: null, streaming: [] };

    const detail = await detailRes.json();
    const storesData = storesRes.ok ? await storesRes.json() : { results: [] };

    // Build store_id → purchase URL map from the sub-endpoint
    const urlMap = {};
    for (const s of storesData.results || []) {
      urlMap[s.store_id] = s.url;
    }

    // Merge metadata (name, domain) + real purchase URLs
    const streaming = (detail.stores || []).slice(0, 6).map((s) => ({
      url: urlMap[s.store.id] || null,
      store: s.store,
    }));

    return { trailerKey: null, streaming };
  } catch {
    return { trailerKey: null, streaming: [] };
  }
}

// ---------------------------------------------------------------------------
// DB upsert (game-only branch)
// ---------------------------------------------------------------------------

async function getOrCreateGamePage(relatedId) {
  let pageDoc = await TopicPage.findOne({ type: "game", relatedId }).lean();
  if (pageDoc) return pageDoc;

  const media = await fetchGameById(relatedId);
  if (!media) return null;

  const rawDescription = media.description_raw || "";

  const newDoc = {
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

  try {
    pageDoc = await TopicPage.create(newDoc);
    if (newDoc.description) {
      rewriteAndPersist(pageDoc._id, newDoc.description, "game").catch((err) =>
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

  return pageDoc?.toObject?.() || pageDoc || null;
}

const getCachedGamePage = cache(async (relatedId) => {
  await connectMongoDB();
  return getOrCreateGamePage(relatedId);
});

// ---------------------------------------------------------------------------
// Next.js exports
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found", description: "Content not found." };

  const pageDoc = await getCachedGamePage(relatedId);
  if (!pageDoc) return { title: "Not Found", description: "Content not found." };

  return buildPageMetadata("game", slug, pageDoc);
}

export default async function GamePage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedGamePage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  const [extras, relatedPages, taggedWheels] = await Promise.all([
    fetchGameExtras(relatedId),
    getRelatedPages(pageDoc.tags || [], pageDoc._id),
    fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "game"),
  ]);

  return (
    <TopicPageLayout
      type="game"
      pageDoc={pageDoc}
      extras={extras}
      relatedPages={relatedPages}
      taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
      animeCharacters={[]}
      displayTitle={displayTitle}
      affiliateLinks={buildAffiliateLinks("game", displayTitle)}
      relatedId={relatedId}
    />
  );
}
