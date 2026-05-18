/**
 * app/(content)/character/[slug]/page.js
 *
 * Character content pages — ISR, 7-day revalidation (character data is stable).
 *
 * Shares @spkrbox/anilist with anime/ (both use AniList as the data source),
 * but TMDB, RAWG, and OpenAI are absent from this bundle unless OPENAI_API_KEY
 * triggers the lazy rewriteAndPersist import.
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

// Character data rarely changes — 7-day revalidation.
export const revalidate = 604800;

// ---------------------------------------------------------------------------
// AniList character fetcher (character-only)
// ---------------------------------------------------------------------------

async function fetchCharacterFromAnilist(id) {
  try {
    const client = new AniList();
    return await client.character.getById(id);
  } catch (err) {
    console.error("fetchCharacterFromAnilist error:", err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DB upsert (character-only branch)
// ---------------------------------------------------------------------------

async function getOrCreateCharacterPage(relatedId) {
  let pageDoc = await TopicPage.findOne({ type: "character", relatedId }).lean();
  if (pageDoc) return pageDoc;

  const character = await fetchCharacterFromAnilist(relatedId);
  if (!character) return null;

  const rawDescription = character.description?.replace(/<[^>]+>/g, "") || "";

  const newDoc = {
    type: "character",
    source: "Anilist",
    relatedId: character.id,
    slug: `${character.id}-${slugify(
      character.name?.full || character.name?.native
    )}`,
    title: {
      english: character.name?.full,
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

  try {
    pageDoc = await TopicPage.create(newDoc);
    if (newDoc.description) {
      rewriteAndPersist(pageDoc._id, newDoc.description, "character").catch(
        (err) => console.error("rewriteAndPersist failed:", err)
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

const getCachedCharacterPage = cache(async (relatedId) => {
  await connectMongoDB();
  return getOrCreateCharacterPage(relatedId);
});

// ---------------------------------------------------------------------------
// Next.js exports
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found", description: "Content not found." };

  const pageDoc = await getCachedCharacterPage(relatedId);
  if (!pageDoc) return { title: "Not Found", description: "Content not found." };

  return buildPageMetadata("character", slug, pageDoc);
}

export default async function CharacterPage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedCharacterPage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  // Characters have no trailers or streaming links — skip extras fetch.
  const [relatedPages, taggedWheels] = await Promise.all([
    getRelatedPages(pageDoc.tags || [], pageDoc._id),
    fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "character"),
  ]);

  return (
    <TopicPageLayout
      type="character"
      pageDoc={pageDoc}
      extras={{ trailerKey: null, streaming: [] }}
      relatedPages={relatedPages}
      taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
      animeCharacters={[]}
      displayTitle={displayTitle}
      affiliateLinks={buildAffiliateLinks("character", displayTitle)}
      relatedId={relatedId}
    />
  );
}
