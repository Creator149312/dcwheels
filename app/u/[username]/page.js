import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import Wheel from "@models/wheel";
import DecisionLog from "@models/decisionLog";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { getPublicSpinStoriesForUser } from "@lib/spinStories";
import { getPostsForUser } from "@lib/posts";
import { getProfileLists, getProfileWheels, buildDashboardData } from "@lib/dashboard";
import { getFeedItems } from "@lib/feedService";
import ProfileHeader from "@components/ProfileHeader";
import ProfileTabs from "@components/ProfileTabs";

/**
 * /u/[username] Profile Route
 * User profile pages showing wheels, lists, posts, and activity (Reddit/Twitter style)
 *
 * URLs:
 *   /u/creators93     → User profile
 *   /u/Creators93     → Auto-redirects to lowercase /u/creators93 (like Reddit/Threads lowercase normalization)
 * 
 * Lookup:
 *   Uses User.username field (lowercase alias) for fast primary keys/index matches
 */

export async function generateMetadata({ params }) {
  const decodedUsername = decodeURIComponent(params.username).trim();
  const lowercaseUsername = decodedUsername.toLowerCase();
  
  try {
    await connectMongoDB();
    const user = await User.findOne({ username: lowercaseUsername })
      .select("name")
      .lean();
    
    const displayName = user?.name || decodedUsername;
    
    return {
      title: `${displayName} (@${lowercaseUsername}) — SpinPapa`,
      description: `View ${displayName}'s public spin wheels and activity on SpinPapa.`,
      openGraph: {
        title: `${displayName} on SpinPapa`,
        description: `Check out ${displayName}'s spin wheels and profile details.`,
      },
      alternates: {
        canonical: `https://spinpapa.com/u/${lowercaseUsername}`,
      },
    };
  } catch (err) {
    // Fallback if DB is unreachable
    return {
      title: `${decodedUsername}'s Profile — SpinPapa`,
      description: `View ${decodedUsername}'s public spin wheels and activity on SpinPapa.`,
    };
  }
}

export default async function ProfilePage({ params }) {
  const decodedUsername = decodeURIComponent(params.username).trim();
  const lowercaseUsername = decodedUsername.toLowerCase();

  // Redirect to lowercase URL if not already lowercase (Standardization)
  // Ensures /u/Creators93 → /u/creators93
  if (params.username !== lowercaseUsername) {
    redirect(`/u/${encodeURIComponent(lowercaseUsername)}`);
  }

  // Basic input guard — prevents unnecessarily long DB queries
  if (!lowercaseUsername || lowercaseUsername.length > 100) notFound();

  await connectMongoDB();

  // Fetch user by unique lowercase username handle — fast exact index match
  // All users (new and migrated) have a username, so this is the primary lookup
  let user = await User.findOne({ username: lowercaseUsername })
    .select("name email createdAt publicSpins role bio website username")
    .lean();

  // Fallback for edge cases: legacy users or email prefix lookup
  if (!user) {
    user = await User.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${lowercaseUsername}$`, "i") } },
        { email: new RegExp(`^${lowercaseUsername}@`, "i") } // Try as email prefix
      ]
    })
      .select("name email createdAt publicSpins role bio website username")
      .lean();

    // If we found them via fallback name/email, redirect to their canonical handle URL
    if (user && user.username && user.username !== lowercaseUsername) {
      redirect(`/u/${encodeURIComponent(user.username)}`);
    }
  }

  if (!user) {
    notFound();
  }

  // 1. Resolve Session details to determine ownership
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.email === user.email;

  // 2. Fetch initial slices of data according to ownership permissions
  const [allWheels, listsList, allPosts, storiesList] = await Promise.all([
    getFeedItems({ userId: String(user._id), docType: "wheel", limit: 13, showPrivate: isOwner }),
    getProfileLists(String(user._id), !isOwner),
    getFeedItems({ userId: String(user._id), docType: "post", limit: 11, showPrivate: isOwner }),
    getPublicSpinStoriesForUser(String(user._id), 20, isOwner),
  ]);

  // Process wheels for pagination
  const wheels = allWheels.slice(0, 12);
  const wheelsCursor = allWheels.length > 12 ? allWheels[11].createdAt : null;

  // Process posts for pagination
  const posts = allPosts.slice(0, 10);
  const postsCursor = allPosts.length > 10 ? allPosts[9].createdAt : null;

  // 3. Calculate stats based on ownership
  const stats = isOwner 
    ? (await buildDashboardData({ userId: String(user._id), email: user.email })).stats
    : {
        decisionsTotal: await DecisionLog.countDocuments({ userId: String(user._id), isPublic: true }),
        wheelsTotal: await Wheel.countDocuments({ userId: user._id, isPublic: true }),
        listsTotal: listsList.length,
        streak: 0 
      };

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
      
      {/* ── Modern Instagram/Threads-style Header & Settings Panel ── */}
      <ProfileHeader
        initialUser={{
          _id: String(user._id),
          name: user.name,
          username: user.username,
          email: isOwner ? user.email : "", // Keep email private if not owner
          role: user.role,
          bio: user.bio || "",
        }}
        isOwner={isOwner}
        joinDate={joinDate}
        stats={stats}
      />

      {/* ── Tabs: Wheels, Lists, Posts, Activity ── */}
      <ProfileTabs
        userId={String(user._id)}
        username={user.name}
        isOwner={isOwner}
        wheels={wheels}
        wheelsCursor={wheelsCursor}
        lists={listsList}
        posts={posts}
        postsCursor={postsCursor}
        stories={storiesList}
      />
    </main>
  );
}
