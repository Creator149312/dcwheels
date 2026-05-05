import { NextResponse } from "next/server";
import { getPublicSpinStoriesForWheel } from "@lib/spinStories";

/**
 * /api/wheels/[id]/spin-stories
 *
 * Returns the most-recent public saved decisions for a wheel. Powers the
 * "Spin Stories" feed on the wheel page. Unauthenticated; the data is
 * intentionally public (that's the whole point of the feed).
 *
 * Caching: 30s public + 60s SWR — same posture as wheel-analytics. The
 * feed updates eventually-consistently for crawlers and concurrent
 * visitors; the spinning user sees their own card immediately via an
 * optimistic client-side prepend.
 */
export async function GET(_request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing wheel id" }, { status: 400 });
    }

    const stories = await getPublicSpinStoriesForWheel(id, 10);
    return NextResponse.json(
      { stories },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("spin-stories GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
