// TMDB preset catalog.
// Each preset is a named query against the TMDB v3 API that returns a list
// of movies. Operators pick a preset (optionally with genre/decade filters)
// to seed a wheel's segments without any AI involvement.
//
// Genre IDs come from https://api.themoviedb.org/3/genre/movie/list
// Company IDs are stable TMDB internals.

export const TMDB_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

export const TMDB_DECADES = [
  { value: "2020s", gte: "2020-01-01", lte: "2029-12-31" },
  { value: "2010s", gte: "2010-01-01", lte: "2019-12-31" },
  { value: "2000s", gte: "2000-01-01", lte: "2009-12-31" },
  { value: "1990s", gte: "1990-01-01", lte: "1999-12-31" },
  { value: "1980s", gte: "1980-01-01", lte: "1989-12-31" },
  { value: "1970s", gte: "1970-01-01", lte: "1979-12-31" },
];

// Each preset produces a base query. Client passes optional overrides for
// `genre`, `decade`, `limit`, and `page`.
//
// `path`      : relative TMDB path to append to https://api.themoviedb.org/3
// `params`    : fixed query params (api_key is appended by the server)
// `titleHint` : default wheel title for this preset (operator can edit)
// `supports`  : which filters this preset accepts
export const TMDB_PRESETS = [
  {
    key: "popular",
    label: "Popular right now",
    path: "/movie/popular",
    params: {},
    titleHint: "Popular Movies Picker Wheel",
    supports: ["page"],
  },
  {
    key: "top_rated",
    label: "Top rated (all time)",
    path: "/movie/top_rated",
    params: {},
    titleHint: "Top Rated Movies Picker Wheel",
    supports: ["page"],
  },
  {
    key: "now_playing",
    label: "Now playing in theatres",
    path: "/movie/now_playing",
    params: {},
    titleHint: "Movies in Theatres Picker Wheel",
    supports: ["page"],
  },
  {
    key: "upcoming",
    label: "Upcoming releases",
    path: "/movie/upcoming",
    params: {},
    titleHint: "Upcoming Movies Picker Wheel",
    supports: ["page"],
  },
  {
    key: "trending_week",
    label: "Trending this week",
    path: "/trending/movie/week",
    params: {},
    titleHint: "Trending This Week Picker Wheel",
    supports: ["page"],
  },
  {
    key: "trending_day",
    label: "Trending today",
    path: "/trending/movie/day",
    params: {},
    titleHint: "Trending Today Picker Wheel",
    supports: ["page"],
  },
  {
    key: "by_genre",
    label: "By genre",
    path: "/discover/movie",
    params: { sort_by: "popularity.desc", "vote_count.gte": 200 },
    titleHint: "{genre} Movies Picker Wheel",
    supports: ["genre", "page"],
  },
  {
    key: "by_decade",
    label: "By decade",
    path: "/discover/movie",
    params: { sort_by: "vote_average.desc", "vote_count.gte": 500 },
    titleHint: "Best of the {decade} Picker Wheel",
    supports: ["decade", "page"],
  },
  {
    key: "critics_darlings",
    label: "Critics' darlings (rating ≥ 7.5, votes ≥ 500)",
    path: "/discover/movie",
    params: {
      sort_by: "vote_average.desc",
      "vote_count.gte": 500,
      "vote_average.gte": 7.5,
    },
    titleHint: "Critically Acclaimed Movies Picker Wheel",
    supports: ["page"],
  },
  {
    key: "genre_decade",
    label: "Genre × decade",
    path: "/discover/movie",
    params: { sort_by: "vote_average.desc", "vote_count.gte": 300 },
    titleHint: "Best {genre} of the {decade} Picker Wheel",
    supports: ["genre", "decade", "page"],
  },
];
