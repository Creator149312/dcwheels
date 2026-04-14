// Rate limiting is now handled inside each API route using MongoDB (lib/rateLimit.js).
// Middleware is kept minimal so it does not add overhead on every request.

export function middleware() {}

export const config = { matcher: [] };

