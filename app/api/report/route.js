import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Report from "@models/report";
import Post from "@models/post";
import Comment from "@models/comment";
import User from "@models/user";
import { shadowBanUser } from "@lib/shadowBan";

// Auto-ban threshold: if a single piece of content accumulates this many
// distinct reports it is shadow-banned immediately without admin review.
const AUTO_BAN_THRESHOLD = 5;

const VALID_REASONS = ["spam", "harassment", "nsfw", "misinformation", "other"];

/**
 * POST /api/report
 * Body: { targetType: "post"|"comment", targetId: string, reason: string }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const { targetType, targetId, reason } = await req.json();

    if (!["post", "comment"].includes(targetType)) {
      return NextResponse.json({ message: "Invalid target type" }, { status: 400 });
    }
    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json({ message: "Invalid target ID" }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ message: "Invalid reason" }, { status: 400 });
    }

    const reporter = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!reporter) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Fetch the target to get a content snapshot and author ID
    let contentSnapshot = "";
    let authorId = null;

    if (targetType === "post") {
      const post = await Post.findById(targetId).select("title userId").lean();
      if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });
      contentSnapshot = post.title?.slice(0, 500) || "";
      authorId = post.userId;
    } else {
      const comment = await Comment.findById(targetId).select("text userId").lean();
      if (!comment) return NextResponse.json({ message: "Comment not found" }, { status: 404 });
      contentSnapshot = comment.text?.slice(0, 500) || "";
      authorId = comment.userId;
    }

    // Prevent self-reports
    if (String(authorId) === String(reporter._id)) {
      return NextResponse.json({ message: "Cannot report your own content" }, { status: 400 });
    }

    // Create the report (unique index prevents double-reporting)
    try {
      await Report.create({
        reporterId: reporter._id,
        targetType,
        targetId,
        reason,
        contentSnapshot,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Already reported by this user — idempotent, return 200
        return NextResponse.json({ message: "Already reported" });
      }
      throw err;
    }

    // Increment report count on the target and check auto-ban threshold
    if (targetType === "post") {
      const updated = await Post.findByIdAndUpdate(
        targetId,
        { $inc: { reportCount: 1 } },
        { new: true }
      ).select("reportCount userId").lean();

      if (updated && updated.reportCount >= AUTO_BAN_THRESHOLD) {
        await shadowBanUser(updated.userId);
      }
    } else {
      // For comments, count total reports against this comment
      const reportCount = await Report.countDocuments({ targetType: "comment", targetId });
      if (reportCount >= AUTO_BAN_THRESHOLD && authorId) {
        await shadowBanUser(authorId);
      }
    }

    return NextResponse.json({ message: "Report submitted. Thank you." });
  } catch (err) {
    console.error("POST /api/report error:", err);
    return NextResponse.json({ message: "Failed to submit report" }, { status: 500 });
  }
}

/**
 * GET /api/report — Admin: list pending reports
 * Query params: status (default "pending"), limit, skip
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const admin = await User.findOne({ email: session.user.email }).select("role").lean();
    if (admin?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));

    const reports = await Report.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Report.countDocuments({ status });

    return NextResponse.json({ reports, total });
  } catch (err) {
    console.error("GET /api/report error:", err);
    return NextResponse.json({ message: "Failed to fetch reports" }, { status: 500 });
  }
}

/**
 * PATCH /api/report — Admin: update report status
 * Body: { reportId, status, adminNote }
 */
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const admin = await User.findOne({ email: session.user.email }).select("_id role").lean();
    if (admin?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { reportId, status, adminNote } = await req.json();
    const VALID_STATUSES = ["pending", "reviewed", "dismissed", "actioned"];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    await Report.findByIdAndUpdate(reportId, {
      status,
      adminNote: adminNote || "",
      reviewedBy: admin._id,
      reviewedAt: new Date(),
    });

    return NextResponse.json({ message: "Report updated" });
  } catch (err) {
    console.error("PATCH /api/report error:", err);
    return NextResponse.json({ message: "Failed to update report" }, { status: 500 });
  }
}
