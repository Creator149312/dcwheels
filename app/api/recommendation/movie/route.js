// app/api/recommendation/movie/route.js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre");
  const page = searchParams.get("page") || 1;
  const excludeIds = (searchParams.get("excludeIds") || "")
    .split(",")
    .filter(Boolean)
    .map((id) => parseInt(id, 10));

  const API_KEY = process.env.TMDB_API_KEY;

  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", page);

  if (genre) url.searchParams.set("with_genres", genre);

  // Practical filters
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("vote_average.gte", "7"); // good rating
  url.searchParams.set("vote_count.gte", "200"); // enough votes to be reliable

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();

  let filtered = (data.results || []).filter((m) => m.poster_path);

  // Exclude already seen IDs
  if (excludeIds.length > 0) {
    filtered = filtered.filter((m) => !excludeIds.includes(m.id));
  }

  // Return a handful of candidates, client picks first unseen
  return Response.json(filtered.slice(0, 5));
}
