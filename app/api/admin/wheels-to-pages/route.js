/**
 * Admin API for converting wheels to pages.
 *
 * GET /api/admin/wheels-to-pages?page=1&limit=20&q=search
 *   Returns paginated wheels from user's account that aren't yet converted to pages.
 *
 * POST /api/admin/wheels-to-pages/convert
 *   Converts a wheel to a page. Creates Page doc with wheel reference.
 *   Body: { wheelId, title?, slug?, indexed? }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import User from "@models/user";
import Page from "@models/page";
import mongoose from "mongoose";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { isValid: false, session: null };
  }
  return { isValid: true, session };
}

// Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(request) {
  const { isValid, session } = await requireAuth();
  if (!isValid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const searchQuery = url.searchParams.get("q") || "";

  await connectMongoDB();

  try {
    // Get userId from session or lookup by email
    let userId = null;
    if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
      userId = new mongoose.Types.ObjectId(session.user.id);
    } else if (session.user.email) {
      const user = await User.findOne({ email: session.user.email }).select("_id").lean();
      if (user) userId = user._id;
    }
    
    // Find wheels created by user
    const searchFilter = userId
      ? searchQuery
        ? {
            userId,
            title: { $regex: searchQuery, $options: "i" },
          }
        : { userId }
      : {
          createdBy: session.user.email,
          title: searchQuery ? { $regex: searchQuery, $options: "i" } : undefined,
        };

    // Remove undefined from filter
    Object.keys(searchFilter).forEach(key => searchFilter[key] === undefined && delete searchFilter[key]);

    // Get total count
    const totalWheels = await Wheel.countDocuments(searchFilter);

    // Find wheels that don't have a corresponding page
    const wheels = await Wheel.find(searchFilter)
      .select("_id title description tags createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    // Check which wheels already have pages
    const wheelIds = wheels.map((w) => w._id);
    const existingPages = await Page.find({ wheel: { $in: wheelIds } })
      .select("wheel")
      .lean();

    const pageWheelIds = new Set(
      existingPages.map((p) => p.wheel.toString())
    );

    // Filter out wheels that already have pages
    const convertibleWheels = wheels
      .filter((w) => !pageWheelIds.has(w._id.toString()))
      .map((w) => ({
        ...w,
        _id: w._id.toString(),
        slug: generateSlug(w.title),
      }));

    return NextResponse.json(
      {
        wheels: convertibleWheels,
        total: totalWheels,
        page,
        limit,
        hasMore: page * limit < totalWheels,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching wheels:", error);
    return NextResponse.json(
      { error: "Failed to fetch wheels" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { isValid, session } = await requireAuth();
  if (!isValid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { wheelId, title, slug, indexed = false } = await request.json();

  if (!wheelId) {
    return NextResponse.json(
      { error: "wheelId is required" },
      { status: 400 }
    );
  }

  await connectMongoDB();

  try {
    // Fetch the wheel
    const wheel = await Wheel.findById(wheelId);

    if (!wheel) {
      return NextResponse.json(
        { error: "Wheel not found" },
        { status: 404 }
      );
    }

    // Verify the wheel belongs to the user
    if (wheel.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: "You do not have permission to convert this wheel" },
        { status: 403 }
      );
    }

    // Check if page already exists
    const existingPage = await Page.findOne({ wheel: wheelId });
    if (existingPage) {
      return NextResponse.json(
        {
          error: "Page already exists for this wheel",
          page: existingPage,
        },
        { status: 409 }
      );
    }

    // Generate slug
    const pageSlug = slug || generateSlug(title || wheel.title);

    // Check if slug is already taken
    const slugExists = await Page.findOne({ slug: pageSlug });
    if (slugExists) {
      return NextResponse.json(
        {
          error: "Slug already exists. Please choose a different slug.",
          suggestedSlug: `${pageSlug}-${Date.now()}`,
        },
        { status: 409 }
      );
    }

    // Create the page
    const pageData = await Page.create({
      title: title || wheel.title,
      description: wheel.description || "",
      slug: pageSlug,
      wheel: wheelId,
      indexed,
      content: [],
    });

    return NextResponse.json(
      {
        message: "Wheel converted to page successfully",
        page: pageData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error converting wheel to page:", error);
    return NextResponse.json(
      { error: "Failed to convert wheel to page" },
      { status: 500 }
    );
  }
}
