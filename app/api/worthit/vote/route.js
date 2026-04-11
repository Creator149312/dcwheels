import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";

// ---------------------------------------------------------------------------
// "Worth It?" vote endpoint
//
// POST /api/worthit/vote
//   Body: { topicPageId: string, vote: "yes" | "no" }
//   Returns: { yes: number, no: number }
//
//   Double-vote prevention: the client sets a localStorage key per page ID
//   before calling this endpoint. The API trusts that signal — no login
//   required, intentionally low-friction. If you later want server-side
//   deduplication, add a VoteLog collection keyed by (pageId + hashedIP).
//
// GET /api/worthit/vote?id=<topicPageId>
//   Returns: { yes: number, no: number }
//   Used by the component on mount to hydrate counts without waiting for
//   the full page server render to re-run.
// ---------------------------------------------------------------------------

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await connectMongoDB();

  const page = await TopicPage.findById(id)
    .select("worthIt")
    .lean();

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    yes: page.worthIt?.yes ?? 0,
    no:  page.worthIt?.no  ?? 0,
  });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { topicPageId, vote } = body;

  // Validate inputs — only "yes" and "no" are accepted
  if (!topicPageId || !["yes", "no"].includes(vote)) {
    return NextResponse.json(
      { error: "topicPageId and vote ('yes' | 'no') are required" },
      { status: 400 }
    );
  }

  await connectMongoDB();

  // $inc is atomic — safe against concurrent votes without transactions
  const updated = await TopicPage.findByIdAndUpdate(
    topicPageId,
    { $inc: { [`worthIt.${vote}`]: 1 } },
    { new: true, select: "worthIt" }
  );

  if (!updated) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({
    yes: updated.worthIt?.yes ?? 0,
    no:  updated.worthIt?.no  ?? 0,
  });
}
