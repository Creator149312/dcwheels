import { slugify } from "@utils/HelperFunctions";
import { AniList, MediaType } from "@spkrbox/anilist";

export function renderAnimeCard(anime) {
  const title = anime.title.english || anime.title.romaji || "Untitled";
  const slug = slugify(title);
  const url = `/anime/${anime.id}-${slug}`;
  return (
    <a key={anime.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img
          src={anime.coverImage.large}
          alt={title}
          className="w-full h-64 object-cover"
        />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {anime.startDate?.year || "—"} · {anime.format}
          </p>
        </div>
      </div>
    </a>
  );
}

export function renderMovieCard(movie) {
  const name = movie.title;
  const slug = slugify(name);
  const url = `/movie/${movie.id}-${slug}`;
  return (
    <a key={movie.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={name}
          className="w-full h-64 object-cover"
        />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate">{name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {movie.release_date?.slice(0, 4) || "—"} ·{" "}
            {movie.genres?.[0]?.name || ""}
          </p>
        </div>
      </div>
    </a>
  );
}

export function renderGameCard(game) {
  const slug = game.slug;
  const url = `/game/${game.id}-${slug}`;
  return (
    <a key={game.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img
          src={game.background_image}
          alt={game.name}
          className="w-full h-64 object-cover"
        />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate">{game.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {game.released?.slice(0, 4) || "—"} · {game.genres?.[0]?.name || ""}
          </p>
        </div>
      </div>
    </a>
  );
}

export function renderCharacterCard(character) {
  const name =
    character.name?.full ||
    character.name?.native ||
    character.name?.alternative?.[0] ||
    "Unnamed";

  const slug = slugify(name);
  const url = `/character/${character.id}-${slug}`;

  return (
    <a key={character.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img
          src={character.image.large}
          alt={name}
          className="w-full h-64 object-cover"
        />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
            {name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {character.gender || "—"} · {character.age || ""}
          </p>
        </div>
      </div>
    </a>
  );
}

//All Fetch Functions based on Type of Content to render
// ---------- Anime Fetch ----------
export async function fetchAnime({
  search,
  genre,
  year,
  page = 1,
  perPage = 20,
  sort = "POPULARITY_DESC",
}) {
  const client = new AniList();
  const response = await client.media.search({
    type: MediaType.ANIME,
    search: search || undefined,
    sort: [sort],
    page,
    perPage,
  });

  let media = response.media || [];
  if (genre) media = media.filter((anime) => anime.genres?.includes(genre));
  if (year)
    media = media.filter((anime) => anime.startDate?.year == parseInt(year));

  // ✅ filter out anime without cover images
  media = media.filter((anime) => anime.coverImage?.large);

  return media;
}

// ---------- Movie Fetch ----------
export async function fetchMovies({ search, genres, year, page = 1 }) {
  const API_KEY = process.env.TMDB_API_KEY;
  if (search) {
    const url = new URL(`https://api.themoviedb.org/3/search/movie`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("query", search);
    url.searchParams.set("page", page);
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return (data.results || []).filter((movie) => movie.poster_path); // ✅ filter here
  }
  const url = new URL(`https://api.themoviedb.org/3/discover/movie`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", page);
  if (genres) url.searchParams.set("with_genres", genres);
  if (year) url.searchParams.set("primary_release_year", year);
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  return (data.results || []).filter((movie) => movie.poster_path); // ✅ filter here
}


// ---------- Game Fetch ----------
export async function fetchGames({
  search,
  genres,
  year,
  page = 1,
  page_size = 20,
}) {
  const API_KEY = process.env.RAWG_API_KEY;
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("page", page);
  url.searchParams.set("page_size", page_size); // ✅ now configurable
  url.searchParams.set("ordering", "-added");

  if (search) url.searchParams.set("search", search);
  if (genres) url.searchParams.set("genres", genres);
  if (year) url.searchParams.set("dates", `${year}-01-01,${year}-12-31`);

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  return (data.results || []).filter((game) => game.background_image);
}

// ---------- Characters Fetch ----------
export async function fetchCharacters({
  search,
  page = 1,
  perPage = 20,
  sort = "FAVOURITES_DESC", // AniList supports sorting by favourites/popularity
}) {
  const client = new AniList();
  const response = await client.character.search({
    search: search || undefined,
    sort: [sort],
    page,
    perPage,
  });

  let characters = response.characters || [];

  // ✅ filter out characters without images
  characters = characters.filter((char) => char.image?.large);

  return characters;
}
