import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { curateMovies, verifyMovies, savePipelineList } from "@lib/adminPipeline";
import { sessionUserId } from "@utils/SessionData";
import { normalizeTag } from "@lib/slug";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { getListUrl } from "@utils/UrlHandler";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "gauravsingh9314@gmail.com";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (session.user.role === "admin") return session;
  if (session.user.email === ADMIN_EMAIL) return session;
  return null;
}

function normalizeTags(tags) {
  if (!tags) return ["ai-curated", "movies", "tmdb-verified"];
  if (Array.isArray(tags)) return tags.map((t) => normalizeTag(t)).filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => normalizeTag(t))
    .filter(Boolean);
}

/**
 * POST /api/admin/pipeline
 *
 * Runs the AI curation → TMDB verification → UnifiedList ingestion flow.
 * When dryRun is true, the list is verified but not persisted.
 */
export async function POST(request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = await sessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim() : "";
    const tags = normalizeTags(body.tags);
    const dryRun = !!body.dryRun;

    const candidates = await curateMovies({ title, description, context });
    const verified = await verifyMovies(candidates);

    if (verified.length < 5) {
      return NextResponse.json(
        {
          error: `Only ${verified.length} movies verified (minimum 5 required).`,
          verifiedCount: verified.length,
        },
        { status: 422 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        list: {
          name: title,
          description,
          itemCount: verified.length,
          items: verified,
          tags,
        },
      });
    }

    const saved = await savePipelineList({
      title,
      description,
      tags,
      items: verified,
      userId,
    });

    return NextResponse.json({ success: true, dryRun: false, list: saved });
  } catch (err) {
    console.error("Pipeline API error:", err);
    return NextResponse.json(
      { error: err.message || "Pipeline failed." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/pipeline
 *
 * Returns the most recent AI-generated lists for the authenticated admin.
 */
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = await sessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoDB();

    const lists = await UnifiedList.find({
      userId,
      isDeleted: { $ne: true },
      tags: { $in: ["ai-curated"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id name description slug items createdAt tags")
      .lean();

    const formatted = lists.map((list) => ({
      id: list._id.toString(),
      name: list.name,
      description: list.description,
      slug: list.slug,
      url: getListUrl(list),
      itemCount: list.items?.length ?? 0,
      createdAt: list.createdAt,
      tags: list.tags || [],
    }));

    return NextResponse.json({ lists: formatted });
  } catch (err) {
    console.error("GET /api/admin/pipeline error:", err);
    return NextResponse.json(
      { error: "Failed to fetch generated lists." },
      { status: 500 }
    );
  }
}
