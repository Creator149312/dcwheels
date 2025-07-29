import { AniList, MediaType } from "@spkrbox/anilist";
import SpinCard from "@/components/SpinCard";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";

export default async function AnimePage({ params }) {
  const { anime } = params; // e.g. "attack-on-titan"
  const client = new AniList();

  const searchRes = await client.media.search({
    search: anime.replace(/-/g, " "),
    type: MediaType.ANIME,
    perPage: 1,
  });

  const summary = searchRes.media[0];
  if (!summary) return <div>Anime not found: "{anime}"</div>;

  const media = await client.media.getById(summary.id);

  // ✅ Normalize anime name to tag format
  const animeTag = anime.toLowerCase().replace(/[^a-z0-9]/gi, "");

  // ✅ Connect to DB and get wheels tagged with the anime
  await connectMongoDB();
  const taggedWheels = await Wheel.find({ tags: animeTag })
    .sort({ createdAt: -1 })
    .lean();

  // 🔧 Example spins (you can remove later)
  const exampleSpins = [
    {
      id: "1",
      user: "otakuGuy",
      avatar: "/avatars/1.png",
      question: "Was Eren a hero or villain?",
      options: ["Hero", "Villain", "Gray area"],
      votes: { Hero: 100, Villain: 60, "Gray area": 25 },
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      user: "memeQueen",
      avatar: "/avatars/2.png",
      question: "Best opening? OP1 / OP2 / OP3",
      options: ["OP1", "OP2", "OP3"],
      votes: { OP1: 40, OP2: 120, OP3: 75 },
      timestamp: "5 hours ago",
    },
  ];

  return (
    <div className="flex flex-col p-6 gap-8 bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Anime Info Section */}
      <section className="flex flex-col sm:flex-row sm:items-start gap-4">
        <img
          src={media.coverImage.medium}
          alt={media.title.english || media.title.romaji}
          className="rounded-lg w-40 h-auto flex-shrink-0"
        />
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {media.title.english || media.title.romaji}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {media.genres.join(", ")}
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {media.description.replace(/<[^>]+>/g, "").slice(0, 500)}…
          </p>
        </div>
      </section>

      {/* Example Spins Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Community Spins</h2>
        {exampleSpins.map((spin) => (
          <SpinCard key={spin.id} spin={spin} />
        ))}
      </section>

      {/* Tagged Wheels Section */}
      {taggedWheels.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Spins Tagged #{animeTag}
          </h2>
          {taggedWheels.map((wheel) => (
            <a
              key={wheel._id}
              href={`/uwheels/${wheel._id}`}
              className="block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition p-4 rounded mb-4"
            >
              <h3 className="text-lg font-semibold">{wheel.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {wheel.description}
              </p>
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
