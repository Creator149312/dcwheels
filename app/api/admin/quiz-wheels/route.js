/**
 * POST /api/admin/quiz-wheels
 *   Body: { title, description, slug, tags, segments }
 *   Creates a Wheel (type:"quiz") + linked indexed Page in one shot.
 *   Returns { wheelId, pageId, slug }
 *
 * GET  /api/admin/quiz-wheels
 *   Returns all quiz-type wheels with their page slugs for the listing.
 *
 * DELETE /api/admin/quiz-wheels?id=<wheelId>
 *   Removes the Wheel and its associated Page.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Page from "@models/page";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "gauravsingh9314@gmail.com";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  if (session.user.role === "admin") return true;
  return session.user.email === ADMIN_EMAIL;
}

const DEFAULT_WHEEL_DATA = {
  segColors: [
    "#3369E8", "#D50F25", "#EEB211", "#009925",
    "#8B00FF", "#FF6600", "#00CED1", "#FF1493",
  ],
  innerRadius: 0,
  spinDuration: 3000,
  maxNumberOfOptions: 200,
  mysteryMode: false,
};

const cleanSlug = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectMongoDB();

  const wheels = await Wheel.find({ wheelType: "quiz" })
    .sort({ createdAt: -1 })
    .select("_id title description tags data createdAt")
    .lean();

  const wheelIds = wheels.map((w) => w._id);
  const pages = await Page.find({ wheel: { $in: wheelIds } })
    .select("wheel slug indexed")
    .lean();

  const pageByWheel = {};
  for (const p of pages) pageByWheel[String(p.wheel)] = p;

  const result = wheels.map((w) => ({
    ...w,
    page: pageByWheel[String(w._id)] ?? null,
  }));

  return NextResponse.json({ wheels: result });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, description, slug: rawSlug, tags, segments } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!Array.isArray(segments) || segments.length === 0)
    return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

  const slug = cleanSlug(rawSlug || title);

  await connectMongoDB();

  // Check slug uniqueness
  const existingPage = await Page.findOne({ slug }).lean();
  if (existingPage)
    return NextResponse.json({ error: `Slug "${slug}" is already taken` }, { status: 409 });

  const wheel = await Wheel.create({
    title: title.trim(),
    description: description?.trim() ?? "",
    data: segments,
    wheelType: "quiz",
    tags: Array.isArray(tags) ? tags : [],
    createdBy: "admin",
    wheelData: DEFAULT_WHEEL_DATA,
  });

  const page = await Page.create({
    title: title.trim(),
    description: description?.trim() ?? "",
    slug,
    indexed: true,
    wheel: wheel._id,
    content: [],
  });

  return NextResponse.json({ wheelId: wheel._id, pageId: page._id, slug }, { status: 201 });
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id param required" }, { status: 400 });

  await connectMongoDB();

  const wheel = await Wheel.findByIdAndDelete(id);
  if (!wheel) return NextResponse.json({ error: "Wheel not found" }, { status: 404 });

  await Page.findOneAndDelete({ wheel: wheel._id });

  return NextResponse.json({ ok: true });
}
