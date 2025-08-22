import { AniList } from "@spkrbox/anilist";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import Wheel from "@/models/wheel";
import YesNoQuestion from "@/models/yesnoquestion";
import TopicInteractionTabs from "@app/(content)/[type]/TopicInteractionTabs";
import ReactionBar from "@components/ReactionBar";
import apiConfig from "@utils/ApiUrlConfig";
import { slugify } from "@utils/HelperFunctions";

const BASE_URL = "https://www.spinpapa.com";

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = "https://api.rawg.io/api";

// --- External API Fetchers ---
async function fetchAnimeFromAnilist(id) {
  const client = new AniList();
  return client.media.getById(id);
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
    const rewritten = await rewriteDescription(rawDescription, "anime");

    newDoc = {
      type: "anime",
      source: "Anilist",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.title.romaji || media.title.english)}`,
      title: media.title,
      cover: media.coverImage?.extraLarge || media.coverImage?.large,
      description: rewritten || rawDescription,
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
    const rewritten = await rewriteDescription(rawDescription, "movie");

    newDoc = {
      type: "movie",
      source: "TMDB",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.title)}`,
      title: { original: media.original_title, localized: media.title },
      cover: media.poster_path
        ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
        : "",
      description: rewritten || rawDescription,
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
    const rewritten = await rewriteDescription(rawDescription, "game");

    newDoc = {
      type: "game",
      source: "RAWG",
      relatedId: media.id,
      slug: `${media.id}-${slugify(media.name)}`,
      title: { default: media.name },
      cover: media.background_image || "",
      description: rewritten || rawDescription,
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
  }

  if (!newDoc) return null;

  try {
    pageDoc = await TopicPage.create(newDoc);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — another request created it just now
      pageDoc = await TopicPage.findOne({ slug: newDoc.slug }).lean();
    } else {
      throw err;
    }
  }

  return pageDoc?.toObject?.() || pageDoc || null;
}

// lib/rewrite.js
export async function rewriteDescription(originalText, type) {
  if (!originalText) return "";

  const prompt = `Rewrite the following ${type} description in a casual descriptive way in 100 words. Make it sound unique and engaging:\n\n"${originalText}"`;

  const res = await fetch(`${apiConfig.apiUrl}/ai/rewrite-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();
  return data.rewrittenText || originalText;
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

  // Related wheels & yes/no questions
  const taggedWheels = await Wheel.find({
    "relatedTo.type": type,
    "relatedTo.id": pageDoc.relatedId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const yesNoQuestions = await YesNoQuestion.find({
    "relatedTo.type": type,
    "relatedTo.id": pageDoc.relatedId,
  })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <section className="flex flex-col sm:flex-row gap-4 mb-6">
        <img
          src={pageDoc.cover || ""}
          alt={
            pageDoc.title?.default ||
            pageDoc.title?.english ||
            pageDoc.title?.romaji ||
            pageDoc.title?.localized ||
            pageDoc.title?.original ||
            "Cover image"
          }
          className="rounded-lg w-full sm:w-64 aspect-[3/4] object-cover shadow-lg"
        />

        <div>
          <h1 className="text-2xl font-bold mb-1">
            {pageDoc.title?.default ||
              pageDoc.title?.english ||
              pageDoc.title?.romaji ||
              pageDoc.title?.localized ||
              pageDoc.title?.original}
          </h1>

          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
            {pageDoc.tags?.join(", ")}
          </p>

          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
            {pageDoc.description}
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {type === "anime" && (
              <>
                <p>
                  <strong>Episodes:</strong> {pageDoc.details?.episodes}
                </p>
              </>
            )}
            {type === "movie" && (
              <>
                <p>
                  <strong>Runtime:</strong> {pageDoc.details?.runtime} min
                </p>
                <p>
                  <strong>Release Year:</strong> {pageDoc.details?.releaseYear}
                </p>
              </>
            )}
            {type === "game" && (
              <>
                <p>
                  <strong>Platform:</strong> {pageDoc.details?.platform}
                </p>
                <p>
                  <strong>Release Year:</strong> {pageDoc.details?.releaseYear}
                </p>
              </>
            )}
          </div>

          <ReactionBar
            initialReactions={JSON.parse(
              JSON.stringify(pageDoc.reactions || {})
            )}
            isFollowing={!!pageDoc.isFollowing}
            contentId={pageDoc._id.toString()}
            type={pageDoc.type}
          />
        </div>
      </section>

      {/* Wheels & Questions sections can go here */}
      <TopicInteractionTabs
        type={type}
        contentId={relatedId.toString()} // ensure it's a string
        taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
      />
    </div>
  );
}
