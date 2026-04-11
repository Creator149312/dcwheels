import { connectMongoDB } from "@/lib/mongodb";
import User from "@models/user";
import Wheel from "@models/wheel";
import Link from "next/link";
import { notFound } from "next/navigation";

// ---------------------------------------------------------------------------
// Public profile page — /profile/[name]
//
// Shows a user's display name, member-since date, and all of their publicly
// saved wheels. The page is a server component so no sensitive data (like the
// user's email) is ever sent to the client; email is only used internally to
// query the Wheel collection.
//
// URL encoding: Next.js decodes params automatically, so spaces in names work
// transparently (e.g. /profile/John%20Doe → params.name = "John Doe").
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const name = decodeURIComponent(params.name).trim();
  return {
    title: `${name}'s Profile — SpinPapa`,
    description: `View ${name}'s public spin wheels on SpinPapa.`,
    openGraph: {
      title: `${name} on SpinPapa`,
      description: `Check out ${name}'s spin wheels.`,
    },
  };
}

export default async function ProfilePage({ params }) {
  const decodedName = decodeURIComponent(params.name).trim();

  // Basic input guard — prevents unnecessarily long DB queries
  if (!decodedName || decodedName.length > 100) notFound();

  await connectMongoDB();

  // Fetch user by exact display name.
  // We select email internally (needed to query wheels) but never render it.
  const user = await User.findOne({ name: decodedName })
    .select("name email createdAt")
    .lean();

  if (!user) notFound();

  // Fetch all wheels this user has saved — sorted newest first, capped at 20
  const wheels = await Wheel.find({ createdBy: user.email })
    .select("title description tags createdAt _id")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  // Generate up-to-2-letter initials for the avatar placeholder
  const initials = decodedName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* ── Profile Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        {/* Initials avatar — replaced with a real image upload in a later phase */}
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{decodedName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Member since {joinDate} ·{" "}
            {wheels.length} public wheel{wheels.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Wheels Grid ─────────────────────────────────────────────────── */}
      {wheels.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No public wheels yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wheels.map((wheel) => (
            <Link
              key={wheel._id.toString()}
              href={`/uwheels/${wheel._id}`}
              className="block bg-gray-50 dark:bg-gray-800 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <h3 className="font-semibold truncate mb-1">{wheel.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {wheel.description}
              </p>
              {wheel.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {wheel.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
