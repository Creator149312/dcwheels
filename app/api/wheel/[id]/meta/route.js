import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { getWheelMeta } from "@components/actions/actions";

/**
 * Batched wheel hydration endpoint.
 * Returns analytics + comment count + reactions + current-user reaction
 * in a single response, replacing 3 separate client calls.
 *
 * Most requests SHOULD NOT hit this route — the wheel page SSR pre-fetches
 * the same data via `getWheelMeta()` and passes it as an initial prop.
 * This route is kept for:
 *   - Client-side refresh / optimistic updates
 *   - Pages where SSR prefetch isn't feasible
 */
export async function GET(_request, { params }) {
  const { id } = params;

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    const meta = await getWheelMeta(id, userId);
    if (!meta) {
      return NextResponse.json({ error: "Invalid wheelId" }, { status: 400 });
    }
    return NextResponse.json({ meta }, { status: 200 });
  } catch (error) {
    console.error("wheel meta fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch wheel meta" },
      { status: 500 }
    );
  }
}
