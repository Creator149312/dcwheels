import { connectMongoDB } from "@/lib/mongodb";
import User from "@models/user";
import Wheel from "@models/wheel";
import DecisionLog from "@models/decisionLog";
import AskVote from "@models/askVote";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSpinStoriesForUser } from "@lib/spinStories";
import { getAsksForUser } from "@lib/askStories";
import ProfileActivityTimeline from "@components/ProfileActivityTimeline";
import { TbUsers, TbFlame } from "react-icons/tb";
import { GiCartwheel } from "react-icons/gi";

// Public profile is purely informational — no per-request state (no cookies,
// no session reads). That makes it a great candidate for ISR: regenerate at
// most every 5 minutes so a redeploy or a new wheel shows up within that
// window, but serve the cached HTML from the edge otherwise.
export const revalidate = 300;

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
    .select("name email createdAt voteStreak")
    .lean();

  if (!user) notFound();

  // Fetch all activity types + decision stats in parallel
  const [wheels, stories, asks, spinCount, voteCount] = await Promise.all([
    Wheel.find({ createdBy: user.email })
      .select("title description tags createdAt _id")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    getPublicSpinStoriesForUser(user._id, 30),
    getAsksForUser(user._id, 20),
    DecisionLog.countDocuments({ userId: String(user._id) }),
    AskVote.countDocuments({ userId: user._id }),
  ]);

  // Merge all types into one timeline sorted by date (Facebook-style)
  const activities = [
    ...stories.map((s) => ({ type: "spin", createdAt: s.createdAt, data: s })),
    ...wheels.map((w) => ({
      type: "wheel",
      createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : null,
      data: { ...w, _id: String(w._id) },
    })),
    ...asks.map((a) => ({ type: "ask", createdAt: a.createdAt, data: a })),
  ]
    .filter((a) => a.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);

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
      <div className="flex items-start gap-4 mb-8">
        {/* Initials avatar — replaced with a real image upload in a later phase */}
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{decodedName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Member since {joinDate}
          </p>

          {/* Decision Identity Stats */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-semibold">
              <GiCartwheel className="h-4 w-4 shrink-0" />
              <span>
                Spun <strong>{spinCount.toLocaleString()}</strong> {spinCount === 1 ? "time" : "times"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full text-sm font-semibold">
              <TbUsers className="h-4 w-4 shrink-0" />
              <span>
                Helped <strong>{voteCount.toLocaleString()}</strong> {voteCount === 1 ? "person" : "people"} decide
              </span>
            </div>
            {(user.voteStreak?.current || 0) > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full text-sm font-semibold">
                <TbFlame className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{user.voteStreak.current}</strong>-day streak
                  {user.voteStreak.longest > user.voteStreak.current && (
                    <span className="ml-1 text-xs opacity-70">
                      (best: {user.voteStreak.longest})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileActivityTimeline
        decodedName={decodedName}
        activities={activities}
      />
    </div>
  );
}
