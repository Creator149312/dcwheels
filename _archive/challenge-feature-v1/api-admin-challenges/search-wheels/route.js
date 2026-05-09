import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Page from "@models/page";
import { isAdminSession } from "@utils/auth/isAdmin";

/**
 * GET /api/admin/challenges/search-wheels?q=naruto&limit=10
 *
 * Returns wheels matching the visible wheel name for the challenge admin wheel picker.
 * Includes both published `/wheels/[slug]` pages and direct `/uwheels/[id]` wheels.
 * Admin-only.
 */
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 30);

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  await connectMongoDB();

  const titleQuery = { $regex: q, $options: "i" };

  const pages = await Page.find({ title: titleQuery })
    .select("title slug wheel")
    .populate("wheel", "_id wheelPreview")
    .sort({ title: 1 })
    .limit(limit)
    .lean();

  const pageWheelIds = pages
    .map((page) => page.wheel?._id?.toString())
    .filter(Boolean);

  const wheels = await Wheel.find({
    title: titleQuery,
    ...(pageWheelIds.length ? { _id: { $nin: pageWheelIds } } : {}),
  })
    .select("_id title wheelPreview")
    .sort({ title: 1 })
    .limit(Math.max(limit - pages.length, 0))
    .lean();

  const pageResults = pages
    .filter((page) => page.wheel?._id)
    .map((page) => ({
      wheelId: page.wheel._id.toString(),
      title: page.title,
      preview: page.wheel.wheelPreview || null,
      path: `/wheels/${page.slug}`,
      source: "page",
    }));

  const wheelResults = wheels.map((wheel) => ({
    wheelId: wheel._id.toString(),
    title: wheel.title,
    preview: wheel.wheelPreview || null,
    path: `/uwheels/${wheel._id.toString()}`,
    source: "user-wheel",
  }));

  return NextResponse.json(
    [...pageResults, ...wheelResults].slice(0, limit)
  );
}
