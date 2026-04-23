import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";
import { sessionData } from "@utils/SessionData";

// Lightweight existence check used by the draft review UI so a human can edit
// a proposed slug and see a live "⚠ collision" warning before publishing.
export async function POST(req) {
  try {
    const session = await sessionData();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await req.json();
    if (typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json({ message: "Missing slug" }, { status: 400 });
    }

    await connectMongoDB();
    const normalized = slug.trim().toLowerCase();
    const existing = await Page.findOne({ slug: normalized })
      .select("slug title")
      .lean();

    return NextResponse.json(
      {
        slug: normalized,
        exists: !!existing,
        existingTitle: existing?.title || null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("checkSlug error:", err);
    return NextResponse.json(
      { message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
