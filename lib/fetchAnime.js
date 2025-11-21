// lib/fetchAnime.js
export async function fetchAnime({
  search,
  genre,
  year,
  minEpisodes,
  maxEpisodes,
  popularity = "popular", // "popular" | "hidden"
  page = 1,
  perPage = 10,
  sort = "POPULARITY_DESC",
}) {
  const query = `
    query ($search: String, $genre: String, $year: Int, $page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(
          search: $search
          type: ANIME
          sort: $sort
          genre_in: [$genre]
          seasonYear: $year
        ) {
          id
          title {
            romaji
            english
          }
          description
          episodes
          popularity
          coverImage {
            large
          }
          genres
          startDate {
            year
          }
        }
      }
    }
  `;

  const variables = { search, genre, year, page, perPage, sort };

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store", // important in Next.js App Router to avoid caching
  });

  const data = await res.json();
  let media = data.data.Page.media || [];

  // Apply extra filters client-side
  if (minEpisodes || maxEpisodes) {
    media = media.filter((anime) => {
      const ep = anime.episodes || 0;
      return (
        (!minEpisodes || ep >= minEpisodes) &&
        (!maxEpisodes || ep <= maxEpisodes)
      );
    });
  }

  if (popularity === "hidden") {
    media = media.filter((anime) => anime.popularity < 10000);
  }

  // Filter out anime without covers
  media = media.filter((anime) => anime.coverImage?.large);

  return media;
}
