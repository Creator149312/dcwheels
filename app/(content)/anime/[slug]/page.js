/**
 * app/(content)/anime/[slug]/page.js
 *
 * Anime content pages — ISR, 7-day revalidation (anime metadata is stable).
 *
 * @spkrbox/anilist is ONLY imported here and in character/. Movie and game
 * server bundles are completely free of the AniList client.
 */

import { AniList } from "@spkrbox/anilist";
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

// Anime metadata is very stable — bump to 7 days.
export const revalidate = 604800;

// ---------------------------------------------------------------------------
// AniList fetchers (anime-only)
// ---------------------------------------------------------------------------

async function fetchAnimeFromAnilist(id) {
  try {
    const client = new AniList();
    return await client.media.getById(id);
  } catch (err) {
    console.error("fetchAnimeFromAnilist error:", err.message);
    return null;
  }
}

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
      next: { revalidate: 604800 },
    });
    if (!res.ok) return { trailerKey: null, streaming: [] };
    const data = await res.json();
    const media = data.data?.Media;
    const trailerKey =
      media?.trailer?.site === "youtube" ? media.trailer.id : null;
    const streaming = (media?.externalLinks || [])
      .filter((l) => l.type === "STREAMING")
      .slice(0, 6);
    return { trailerKey, streaming };
  } catch {
    return { trailerKey: null, streaming: [] };
  }
}

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
      next: { revalidate: 604800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const characters = data.data?.Media?.characters?.nodes || [];
    return characters.filter((c) => c && c.name?.full && c.image?.large);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// DB upsert (anime-only branch)
// ---------------------------------------------------------------------------

async function getOrCreateAnimePage(relatedId) {
  let pageDoc = await TopicPage.findOne({ type: "anime", relatedId }).lean();
  if (pageDoc) return pageDoc;

  const media = await fetchAnimeFromAnilist(relatedId);
  if (!media) return null;

  const rawDescription = media.description?.replace(/<[^>]+>/g, "") || "";

  const newDoc = {
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

  try {
    pageDoc = await TopicPage.create(newDoc);
    if (newDoc.description) {
      rewriteAndPersist(pageDoc._id, newDoc.description, "anime").catch((err) =>
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

const getCachedAnimePage = cache(async (relatedId) => {
  await connectMongoDB();
  return getOrCreateAnimePage(relatedId);
});

// ---------------------------------------------------------------------------
// Next.js exports
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found", description: "Content not found." };

  const pageDoc = await getCachedAnimePage(relatedId);
  if (!pageDoc) return { title: "Not Found", description: "Content not found." };

  return buildPageMetadata("anime", slug, pageDoc);
}

export default async function AnimePage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedAnimePage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  const [extras, relatedPages, taggedWheels, animeCharacters] =
    await Promise.all([
      fetchAnimeExtras(relatedId),
      getRelatedPages(pageDoc.tags || [], pageDoc._id),
      fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "anime"),
      fetchAnimeCharacters(relatedId),
    ]);

  return (
    <TopicPageLayout
      type="anime"
      pageDoc={pageDoc}
      extras={extras}
      relatedPages={relatedPages}
      taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
      animeCharacters={animeCharacters}
      displayTitle={displayTitle}
      affiliateLinks={buildAffiliateLinks("anime", displayTitle)}
      relatedId={relatedId}
    />
  );
}
