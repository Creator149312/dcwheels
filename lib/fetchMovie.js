
export async function fetchMovies({ search, genres, year, length, page = 1 }) {
  const API_KEY = process.env.TMDB_API_KEY;

  if (search) {
    const url = new URL(`https://api.themoviedb.org/3/search/movie`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("query", search);
    url.searchParams.set("page", page);
    // TMDB search results for a given query are stable for the day. Cache
    // at the Vercel data layer so we stop hammering the upstream and the
    // origin function on repeat /search and content pages.
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();
    return (data.results || []).filter((movie) => movie.poster_path);
  }

  const url = new URL(`https://api.themoviedb.org/3/discover/movie`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", page);

  if (genres) url.searchParams.set("with_genres", genres);
  if (year) url.searchParams.set("primary_release_year", year);

  // ✅ Runtime filters
  if (length === "Short (<90 min)") {
    url.searchParams.set("with_runtime.lte", 90);
  } else if (length === "Medium (90–150 min)") {
    url.searchParams.set("with_runtime.gte", 90);
    url.searchParams.set("with_runtime.lte", 150);
  } else if (length === "Long (>150 min)") {
    url.searchParams.set("with_runtime.gte", 150);
  }

  const res = await fetch(url, { next: { revalidate: 86400 } });
  const data = await res.json();
  return (data.results || []).filter((movie) => movie.poster_path);
}
