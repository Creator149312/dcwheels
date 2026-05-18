import { slugify } from "@utils/HelperFunctions";
import { AniList, MediaType } from "@spkrbox/anilist";
import { unstable_cache } from "next/cache";
import QuickSaveButton from "@components/QuickSaveButton";

// ─── Genre quick-filter pill lists (per content type) ────────────────────────
export const GENRE_PILLS = {
  anime:     ["Action", "Romance", "Fantasy", "Comedy", "Drama", "Sci-Fi", "Horror", "Sports"],
  movie:     ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Animation"],
  game:      ["action", "role-playing-games-rpg", "strategy", "shooter", "adventure", "sports", "puzzle", "racing"],
  character: [],
};

// TMDB discover requires numeric genre IDs, not string names.
const TMDB_GENRE_MAP = {
  Action: 28, Comedy: 35, Drama: 18, Horror: 27,
  "Sci-Fi": 878, Romance: 10749, Thriller: 53, Animation: 16,
};

// ─── Hero card (full-width spotlight, page 1 only) ───────────────────────────
function _getHeroData(item, type) {
  if (type === "anime") {
    const title = item.title?.english || item.title?.romaji || "";
    return {
      img: item.coverImage?.large,
      title,
      url: `/anime/${item.id}-${slugify(title)}`,
      rating: item.averageScore ? (item.averageScore / 10).toFixed(1) : null,
      ratingLabel: "/ 10",
      genre: item.genres?.[0] || null,
      description: item.description?.replace(/<[^>]+>/g, "").slice(0, 180) || null,
    };
  }
  if (type === "movie") {
    const title = item.title || "";
    return {
      img: item.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
        : `https://image.tmdb.org/t/p/w500${item.poster_path}`,
      title,
      url: `/movie/${item.id}-${slugify(title)}`,
      rating: item.vote_average ? item.vote_average.toFixed(1) : null,
      ratingLabel: "/ 10",
      genre: null,
      description: item.overview?.slice(0, 180) || null,
    };
  }
  if (type === "game") {
    return {
      img: item.background_image,
      title: item.name || "",
      url: `/game/${item.id}-${item.slug}`,
      rating: item.rating ? item.rating.toFixed(1) : null,
      ratingLabel: "/ 5",
      genre: item.genres?.[0]?.name || null,
      description: null,
    };
  }
  return {};
}

export function renderHeroCard(item, type) {
  const { img, title, url, rating, ratingLabel, genre, description } = _getHeroData(item, type);
  if (!img || !title) return null;
  return (
    <a key={`hero-${item.id}`} href={url} className="block relative h-72 md:h-[420px] overflow-hidden bg-gray-900">
      <img src={img} alt={title} className="w-full h-full object-cover object-center opacity-75" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-8 left-5 md:left-12 max-w-xl">
        {genre && (
          <span className="inline-block text-[11px] font-semibold bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full mb-3 uppercase tracking-wide">
            {genre}
          </span>
        )}
        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-300 line-clamp-2 mb-3 max-w-md">{description}</p>
        )}
        <div className="flex items-center gap-4 mt-1">
          {rating && (
            <span className="text-yellow-400 font-semibold text-sm">
              ★ {rating} <span className="text-gray-400 font-normal">{ratingLabel}</span>
            </span>
          )}
          <span className="inline-block bg-background text-foreground font-semibold text-sm px-5 py-2 rounded-full hover:bg-muted transition">
            Explore →
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── Card renderers ───────────────────────────────────────────────────────────
export function renderAnimeCard(anime) {
  const title = anime.title.english || anime.title.romaji || "Untitled";
  const url = `/anime/${anime.id}-${slugify(title)}`;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const genre = anime.genres?.[0];
  return (
    <div key={anime.id} className="group relative block">
      <a href={url} className="block relative rounded-xl overflow-hidden bg-muted shadow-sm hover:-translate-y-0.5 hover:shadow-md transition duration-200">
        <img src={anime.coverImage.large} alt={title} className="w-full aspect-[3/4] object-cover" />
        {score && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded-md">
            ★ {score}
          </div>
        )}
        {genre && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 px-2">
            <span className="text-[10px] font-medium bg-primary/90 text-primary-foreground px-2 py-0.5 rounded-full">{genre}</span>
          </div>
        )}
      </a>
      <QuickSaveButton
        entityType="anime"
        entityId={anime.id.toString()}
        itemTitle={title}
        itemSlug={`${anime.id}-${slugify(title)}`}
        itemImage={anime.coverImage.large}
      />
      <a href={url} className="block mt-1.5 px-0.5">
        <h3 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-muted-foreground">{anime.startDate?.year || "—"} · {anime.format}</p>
      </a>
    </div>
  );
}

export function renderMovieCard(movie) {
  const name = movie.title;
  const url = `/movie/${movie.id}-${slugify(name)}`;
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;
  const image = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  return (
    <div key={movie.id} className="group relative block">
      <a href={url} className="block relative rounded-xl overflow-hidden bg-muted shadow-sm hover:-translate-y-0.5 hover:shadow-md transition duration-200">
        <img src={image} alt={name} className="w-full aspect-[3/4] object-cover" />
        {rating && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded-md">
            ★ {rating}
          </div>
        )}
      </a>
      <QuickSaveButton
        entityType="movie"
        entityId={movie.id.toString()}
        itemTitle={name}
        itemSlug={`${movie.id}-${slugify(name)}`}
        itemImage={image}
      />
      <a href={url} className="block mt-1.5 px-0.5">
        <h3 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-xs text-muted-foreground">{movie.release_date?.slice(0, 4) || "—"}</p>
      </a>
    </div>
  );
}

export function renderGameCard(game) {
  const url = `/game/${game.id}-${game.slug}`;
  const rating = game.rating ? game.rating.toFixed(1) : null;
  const isMobile = game.platforms?.some((p) => [21, 3].includes(p.platform?.id));
  const genre = game.genres?.[0]?.name;
  return (
    <div key={game.id} className="group relative block">
      <a href={url} className="block relative rounded-xl overflow-hidden bg-muted shadow-sm hover:-translate-y-0.5 hover:shadow-md transition duration-200">
        <img src={game.background_image} alt={game.name} className="w-full aspect-[3/4] object-cover" />
        {rating && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded-md">
            ★ {rating}
          </div>
        )}
        {isMobile && (
          <div className="absolute top-2 left-10 bg-green-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            📱 Mobile
          </div>
        )}
        {genre && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 px-2">
            <span className="text-[10px] font-medium text-white/90 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">{genre}</span>
          </div>
        )}
      </a>
      <QuickSaveButton
        entityType="game"
        entityId={game.id.toString()}
        itemTitle={game.name}
        itemSlug={`${game.id}-${game.slug}`}
        itemImage={game.background_image}
      />
      <a href={url} className="block mt-1.5 px-0.5">
        <h3 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{game.name}</h3>
        <p className="text-xs text-muted-foreground">{game.released?.slice(0, 4) || "—"}{genre ? ` · ${genre}` : ""}</p>
      </a>
    </div>
  );
}

export function renderCharacterCard(character) {
  const name = character.name?.full || character.name?.native || character.name?.alternative?.[0] || "Unnamed";
  const url = `/character/${character.id}-${slugify(name)}`;
  const fav = character.favourites;
  const favLabel = fav >= 1000 ? `${(fav / 1000).toFixed(0)}k` : fav ? String(fav) : null;
  return (
    <div key={character.id} className="group relative block">
      <a href={url} className="block relative rounded-xl overflow-hidden bg-muted shadow-sm hover:-translate-y-0.5 hover:shadow-md transition duration-200">
        <img src={character.image.large} alt={name} className="w-full aspect-[3/4] object-cover" />
        {favLabel && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-pink-400 text-xs font-bold px-1.5 py-0.5 rounded-md">
            ♥ {favLabel}
          </div>
        )}
      </a>
      <QuickSaveButton
        entityType="character"
        entityId={character.id.toString()}
        itemTitle={name}
        itemSlug={`${character.id}-${slugify(name)}`}
        itemImage={character.image.large}
      />
      <a href={url} className="block mt-1.5 px-0.5">
        <h3 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-xs text-muted-foreground">{character.gender || "—"}</p>
      </a>
    </div>
  );
}

// \u2500\u2500\u2500 Fetch functions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// External APIs are rate-limited. unstable_cache deduplucates identical
// requests within the revalidation window so we never hammer the upstreams.
const EXTERNAL_API_REVALIDATE = 3600; // 1 hour

// ---------- Anime ----------
const _fetchAnimeUncached = async ({ search, genre, year, page, perPage, sort }) => {
  const client = new AniList();
  const response = await client.media.search({
    type: MediaType.ANIME,
    search: search || undefined,
    sort: [sort],
    page,
    perPage,
  });
  let media = response.media || [];
  if (genre) media = media.filter((a) => a.genres?.includes(genre));
  if (year)  media = media.filter((a) => a.startDate?.year === parseInt(year));
  return media.filter((a) => a.coverImage?.large);
};

const _cachedFetchAnime = unstable_cache(_fetchAnimeUncached, ["fetch-anime"], {
  revalidate: EXTERNAL_API_REVALIDATE,
  tags: ["external-anilist"],
});

export async function fetchAnime({
  search, genre, year, page = 1, perPage = 20, sort = "TRENDING_DESC",
}) {
  return _cachedFetchAnime({ search, genre, year, page, perPage, sort });
}

// ---------- Movies ----------
export async function fetchMovies({
  search, genres, year, page = 1, sortBy = "popularity.desc",
}) {
  const API_KEY = process.env.TMDB_API_KEY;
  const opts = { next: { revalidate: EXTERNAL_API_REVALIDATE, tags: ["external-tmdb"] } };

  if (search) {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("query", search);
    url.searchParams.set("page", page);
    return ((await (await fetch(url, opts)).json()).results || []).filter((m) => m.poster_path);
  }

  // Trending endpoint gives real this-week trending, much better than discover popularity.
  if (sortBy === "popularity.desc" && !genres && !year) {
    const url = new URL("https://api.themoviedb.org/3/trending/movie/week");
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", page);
    return ((await (await fetch(url, opts)).json()).results || []).filter((m) => m.poster_path);
  }

  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", page);
  url.searchParams.set("sort_by", sortBy);
  if (genres) url.searchParams.set("with_genres", TMDB_GENRE_MAP[genres] || genres);
  if (year)   url.searchParams.set("primary_release_year", year);
  // Require enough votes on top-rated to prevent obscure films dominating.
  if (sortBy === "vote_average.desc") url.searchParams.set("vote_count.gte", "200");
  return ((await (await fetch(url, opts)).json()).results || []).filter((m) => m.poster_path);
}

// ---------- Games ----------
export async function fetchGames({
  search, genres, year, page = 1, page_size = 20, ordering = "-added",
}) {
  const API_KEY = process.env.RAWG_API_KEY;
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("page", page);
  url.searchParams.set("page_size", page_size);
  url.searchParams.set("ordering", ordering);
  if (search) url.searchParams.set("search", search);
  if (genres) url.searchParams.set("genres", genres);
  if (year) {
    url.searchParams.set("dates", `${year}-01-01,${year}-12-31`);
  } else {
    const now = new Date();
    const ago = new Date(now);
    ago.setFullYear(ago.getFullYear() - 1);
    const fmt = (d) => d.toISOString().slice(0, 10);
    url.searchParams.set("dates", `${fmt(ago)},${fmt(now)}`);
  }
  const res = await fetch(url, { next: { revalidate: EXTERNAL_API_REVALIDATE, tags: ["external-rawg"] } });
  return ((await res.json()).results || []).filter((g) => g.background_image);
}

// ---------- Mobile Games (Android=21, iOS=3) ----------
export async function fetchMobileGames({ page = 1, page_size = 8 } = {}) {
  const API_KEY = process.env.RAWG_API_KEY;
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("page", page);
  url.searchParams.set("page_size", page_size);
  url.searchParams.set("ordering", "-added");
  url.searchParams.set("platforms", "21,3");
  const now = new Date();
  const ago = new Date(now);
  ago.setFullYear(ago.getFullYear() - 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  url.searchParams.set("dates", `${fmt(ago)},${fmt(now)}`);
  const res = await fetch(url, { next: { revalidate: EXTERNAL_API_REVALIDATE, tags: ["external-rawg"] } });
  return ((await res.json()).results || []).filter((g) => g.background_image);
}

// ---------- Characters ----------
const _fetchCharactersUncached = async ({ search, page, perPage, sort }) => {
  const client = new AniList();
  const response = await client.character.search({
    search: search || undefined,
    sort: [sort],
    page,
    perPage,
  });
  return (response.characters || []).filter((c) => c.image?.large);
};

const _cachedFetchCharacters = unstable_cache(
  _fetchCharactersUncached,
  ["fetch-characters"],
  { revalidate: EXTERNAL_API_REVALIDATE, tags: ["external-anilist"] }
);

export async function fetchCharacters({
  search, page = 1, perPage = 20, sort = "FAVOURITES_DESC",
}) {
  return _cachedFetchCharacters({ search, page, perPage, sort });
}
