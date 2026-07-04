import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import Post from "@models/post";
import Comment from "@models/comment";
import { shadowBanUser } from "@lib/shadowBan";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "gauravsingh9314@gmail.com";

/**
 * POST /api/admin/shadow-ban
 * Admin-only: resolve the author of a targetType/targetId and shadow-ban them.
 * Body: { targetType: "post"|"comment", targetId: string }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    // Check admin role OR admin email fallback
    const admin = await User.findOne({ email: session.user.email }).select("role").lean();
    const isAdmin = admin?.role === "admin" || session.user.email === ADMIN_EMAIL;
    if (!isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { targetType, targetId } = await req.json();

    let authorId = null;
    if (targetType === "post") {
      const post = await Post.findById(targetId).select("userId").lean();
      authorId = post?.userId;
    } else if (targetType === "comment") {
      const comment = await Comment.findById(targetId).select("userId").lean();
      authorId = comment?.userId;
    }

    if (!authorId) {
      return NextResponse.json({ message: "Target not found" }, { status: 404 });
    }

    await shadowBanUser(authorId);

    return NextResponse.json({ message: "User shadow-banned successfully" });
  } catch (err) {
    console.error("POST /api/admin/shadow-ban error:", err);
    return NextResponse.json({ message: "Failed to shadow-ban user" }, { status: 500 });
  }
}
