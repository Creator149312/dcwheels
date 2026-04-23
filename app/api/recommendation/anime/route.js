// app/api/recommendation/anime/route.js
//
// Keeps the AniList client SDK on the server instead of shipping it (and the
// transitive `graphql` dep, combined ~70KB) to every visitor of the
// /recommendation page. Previously `lib/fetchAnime.js` was imported directly
// from a "use client" component, which pulled the lib into the client
// bundle for anyone who loaded the page — even if they only wanted movies.
import { fetchAnime } from "@lib/fetchAnime";

// Cache identical query strings for 1h at the CDN edge. AniList popularity
// rankings barely move in that window, so we'd rather serve from the edge
// than hit their GraphQL endpoint on every click.
export const revalidate = 3600;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const genre = searchParams.get("genre") || undefined;
    const perPage = Math.min(
      parseInt(searchParams.get("perPage") || "15", 10) || 15,
      30
    );
    const sort = searchParams.get("sort") || "POPULARITY_DESC";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const results = await fetchAnime({ genre, perPage, sort, page });
    return Response.json(results);
  } catch (err) {
    console.error("recommendation/anime error:", err);
    return Response.json([], { status: 200 });
  }
}
