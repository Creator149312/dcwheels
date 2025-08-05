import { AniList, MediaType } from "@spkrbox/anilist";
import { connectMongoDB } from "@/lib/mongodb";
import Anime from "@/models/anime";
import Wheel from "@/models/wheel";

// Converts title into a clean slug
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Extract ID from "1234-your-lie-in-april"
function extractId(animeParam) {
  const id = parseInt(animeParam.split("-")[0], 10);
  return isNaN(id) ? null : id;
}

function generateHashtags(titleObj) {
  const tags = [];

  if (titleObj.english) {
    tags.push(titleObj.english.replace(/[^a-z0-9]/gi, ""));
  }

  if (titleObj.romaji) {
    tags.push(titleObj.romaji.replace(/[^a-z0-9]/gi, ""));
  }

  return tags;
}

export async function generateMetadata({ params }) {
  const id = extractId(params.anime);
  if (!id) {
    return {
      title: "Anime Not Found",
      description: "The anime you’re looking for could not be found.",
    };
  }

  const client = new AniList();
  const media = await client.media.getById(id);

  if (!media) {
    return {
      title: "Anime Not Found",
      description: `Could not locate anime with ID ${id}`,
    };
  }

  const displayTitle = media.title.english || media.title.romaji;
  const plainDescription =
    media.description?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    "Explore this anime's details and community-generated wheels.";

  return {
    title: displayTitle,
    description: plainDescription,
    openGraph: {
      title: displayTitle,
      description: plainDescription,
      images: [media.coverImage?.large || media.coverImage?.medium],
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description: plainDescription,
      images: [media.coverImage?.large || media.coverImage?.medium],
    },
  };
}

export default async function AnimeDetailPage({ params }) {
  const id = extractId(params.anime);

  if (!id) return <div>Invalid Anime URL</div>;

  const client = new AniList();
  await connectMongoDB();

  // 1. Try to find in DB
  let animeDoc = await Anime.findOne({ anilistId: id });
  let media;

  // 2. Fetch wheels where relatedTo.type === 'anime' and relatedTo.id === anilistId
  const taggedWheels = await Wheel.find({
    "relatedTo.type": "anime",
    "relatedTo.id": animeDoc.anilistId,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!animeDoc) {
    media = await client.media.getById(id);
    if (!media) return <div>Anime not found</div>;

    const generatedSlug = `${media.id}-${slugify(
      media.title.romaji || media.title.english
    )}`;
    const hashtagTags = generateHashtags(media.title);

    animeDoc = await Anime.create({
      anilistId: media.id,
      slug: generatedSlug,
      title: media.title,
      wheels: taggedWheels.length,
      followers: 0,
      tags: hashtagTags,
    });
  } else {
    media = await client.media.getById(animeDoc.anilistId);
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      {/* Anime Info */}
      <section className="flex flex-col sm:flex-row gap-4 mb-6">
        <img
          src={media.coverImage?.medium}
          alt={media.title.english || media.title.romaji}
          className="rounded-lg w-40 h-auto"
        />
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {media.title.english || media.title.romaji}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
            {media.genres?.join(", ")}
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
            {media.description?.replace(/<[^>]+>/g, "").slice(0, 500)}…
          </p>
          <p className="text-sm mt-2">
            <strong>Followers:</strong> {animeDoc.followers} |{" "}
            <strong>Wheels:</strong> {taggedWheels.length || animeDoc.wheels}
          </p>
        </div>
      </section>

      {/* Decision Wheels */}
      {taggedWheels.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">🎡 Decision Wheels</h2>
          <div className="space-y-4">
            {taggedWheels.map((wheel) => (
              <a
                key={wheel._id}
                href={`/uwheels/${wheel._id}`}
                className="block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition p-4 rounded"
              >
                <h3 className="text-md font-semibold">{wheel.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {wheel.description}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
