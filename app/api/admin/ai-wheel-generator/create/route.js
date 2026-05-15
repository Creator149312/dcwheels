/**
 * Create wheel endpoint
 * POST /api/admin/ai-wheel-generator/create
 *
 * Creates the final wheel and page document.
 * Body: { title, description, segments, tags, slug, indexed? }
 * Returns: { wheelId, pageId, slug, url }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Page from "@models/page";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { isValid: false, session: null };
  }
  return { isValid: true, session };
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanTag(t) {
  return String(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateDefaultColors(count) {
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
    "#14b8a6", "#f59e0b", "#10b981", "#6366f1",
  ];
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

export async function POST(request) {
  const { isValid, session } = await requireAuth();
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      title,
      shortDescription,
      contentParagraphs = [],
      segments,
      tags = [],
      slug,
      indexed = false,
    } = await request.json();

    if (!title || !shortDescription || !segments || segments.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Generate/validate slug
    const pageSlug = slug || generateSlug(title);

    // Check if slug already exists
    const slugExists = await Page.findOne({ slug: pageSlug });
    if (slugExists) {
      return NextResponse.json(
        {
          error: "Slug already exists",
          suggestedSlug: `${pageSlug}-${Date.now()}`,
        },
        { status: 409 }
      );
    }

    // Create wheel document — data is stored as plain {text} objects; weight is
    // UI-only metadata used during the creation flow and is NOT persisted.
    const wheelDoc = {
      title,
      description: shortDescription,
      data: segments.map((seg) => ({ text: seg.text })),
      createdBy: session.user.email,
      tags: tags
        .map((t) => cleanTag(t))
        .filter(Boolean)
        .slice(0, 15),
      wheelData: {
        segColors: generateDefaultColors(segments.length),
        spinDuration: 5,
        maxNumberOfOptions: 100,
        innerRadius: 15,
        removeWinnerAfterSpin: false,
        customPopupDisplayMessage: "The Winner is...",
      },
      editorData: {
        advOptions: false,
      },
      isPublic: false,
    };

    const wheel = await Wheel.create(wheelDoc);

    // Build page content paragraphs in the same shape used by existing pages.
    const pageContent = contentParagraphs.map((text) => ({
      type: "paragraph",
      text,
    }));

    // Create page document
    const pageData = await Page.create({
      title,
      description: shortDescription,
      slug: pageSlug,
      wheel: wheel._id,
      indexed,
      content: pageContent,
    });

    return NextResponse.json(
      {
        message: "Wheel created successfully",
        wheelId: wheel._id,
        pageId: pageData._id,
        slug: pageSlug,
        url: `/wheels/${pageSlug}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create wheel error:", error);
    return NextResponse.json(
      { error: "Failed to create wheel" },
      { status: 500 }
    );
  }
}
