import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import { getPublicSpinStoriesForUser } from "@lib/spinStories";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

/**
 * /api/u/[username]/activity
 *
 * Per-user spin activity for the profile's Activity modal. Public decisions for
 * everyone; the owner additionally sees their own private decisions.
 * Lazy-fetched by the client only when the modal opens — not on page load.
 */
export async function GET(_request, { params }) {
  try {
    const { username } = params;
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    await connectMongoDB();
    const user = await User.findOne({ username: username.toLowerCase() }).select("_id email").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Owner sees their private decisions too; everyone else gets public only.
    const session = await getServerSession(authOptions);
    const isOwner = !!session?.user?.email && session.user.email === user.email;

    const stories = await getPublicSpinStoriesForUser(String(user._id), 30, isOwner);

    return NextResponse.json(
      { stories },
      {
        status: 200,
        headers: {
          "Cache-Control": isOwner
            ? "private, no-store"
            : "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/u/[username]/activity error:", err);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
