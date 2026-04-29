import { NextResponse } from "next/server";
import {
  incrementWheelViewCount,
  shouldTrackView,
} from "@lib/wheelAnalytics";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";

/**
 * Client-triggered view-count endpoint.
 *
 * Why a separate route instead of calling incrementWheelViewCount directly
 * from the Server Component? Because reading request headers in the page
 * (for bot / prefetch detection) forces dynamic rendering and prevents
 * CDN caching. By moving this to a POST triggered from a client effect
 * after hydration, the wheel page itself can be statically cached and
 * served from the CDN for the vast majority of requests.
 *
 * Bot / prefetch filtering still happens server-side using the POST's
 * own request headers — bots and link-preview crawlers don't execute
 * client JS, so they won't hit this endpoint at all in practice.
 */
export async function POST(request) {
  const ip = getIpFromRequest(request);
  const { limited } = await checkRateLimit(ip, "/api/track-view");
  // Silently drop excess view-count pings — no need to error the client.
  if (limited) return NextResponse.json({ ok: true, tracked: false });

  try {
    const body = await request.json();
    const { wheelId } = body;
    if (!wheelId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Defensive bot/prefetch filter for direct API callers.
    if (!shouldTrackView(request.headers)) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    // The client samples 1-in-N to reduce function invocations. When a ping
    // does land, it tells us how many views it represents so the persisted
    // count tracks reality. Clamp to [1, 10] so a tampered client can’t
    // arbitrarily inflate counts.
    const sampleN = Math.max(1, Math.min(10, Number(body.sampleN) || 1));

    await incrementWheelViewCount(wheelId, sampleN).catch(() => {});
    return NextResponse.json({ ok: true, tracked: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
