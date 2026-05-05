import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getWheelAnalytics } from "@lib/wheelAnalytics";

export async function GET(_request, { params }) {
  try {
    const { wheelId } = params;

    if (!mongoose.Types.ObjectId.isValid(wheelId)) {
      return NextResponse.json({ error: "Invalid wheelId" }, { status: 400 });
    }

    const analytics = await getWheelAnalytics(wheelId);
    // Public, short-lived cache so the CDN/browser absorbs duplicate
    // fetches across page navigations and concurrent visitors.
    //   - max-age=30: a fresh response is reused for 30s.
    //   - s-maxage=30: same for shared caches (Vercel edge / CDN).
    //   - stale-while-revalidate=60: serve stale up to 60s while a
    //     background refresh runs, so a burst of users on a popular
    //     wheel never collides on the origin.
    // Stats are non-critical and eventually-consistent (background refresh
    // every 60s on the client), so a 30s window is invisible to users.
    return NextResponse.json(
      { analytics },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch wheel analytics" },
      { status: 500 }
    );
  }
}
