import { NextResponse } from "next/server";

export const GUEST_COOKIE_NAME = "sp_guest_id";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Middleware: Provisions a persistent, privacy-preserving guest_id for every visitor.
 * Ensures zero-friction interactions (polls, spins, affinity signals) without requiring signup.
 */
export function middleware(request) {
  const response = NextResponse.next();

  const existingGuestId = request.cookies.get(GUEST_COOKIE_NAME)?.value;

  if (!existingGuestId) {
    const newGuestId = crypto.randomUUID();

    // Attach to outgoing response so browser stores the cookie
    response.cookies.set({
      name: GUEST_COOKIE_NAME,
      value: newGuestId,
      maxAge: ONE_YEAR_SECONDS,
      path: "/",
      sameSite: "lax",
      httpOnly: false, // readable by client-side if needed for localStorage cache / quick checks
    });

    // Also forward to request headers so any downstream Next.js route handler in this request can read it immediately
    response.headers.set("x-guest-id", newGuestId);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - static image formats (png, jpg, jpeg, svg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
