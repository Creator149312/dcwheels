import {
  fetchAnime,
  fetchCharacters,
  fetchGames,
  fetchMobileGames,
  fetchMovies,
  renderAnimeCard,
  renderCharacterCard,
  renderGameCard,
  renderMovieCard,
  renderHeroCard,
  GENRE_PILLS,
} from "./TopicPagesHelperFunctions";
import FiltersBarWrapper from "./FiltersBarWrapper";

// Build a ?query=string that preserves all active filters while overriding
// specific keys (e.g. to change the page number).
function buildHref(sp, updates = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp || {})) {
    if (k !== "page" && v) p.set(k, String(v));
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v != null && String(v) !== "") p.set(k, String(v));
    else p.delete(k);
  }
  return `?${p.toString()}`;
}

export async function generateMetadata({ params }) {
  const { type } = params;

  const typeLabels = {
    anime: "Anime",
    movie: "Movies",
    game: "Games",
    character: "Characters",
    custom: "Custom Wheels",
  };

  const typeDescriptions = {
    anime:
      "Discover trending anime titles, vote on your favorites, and explore community-generated wheels and lists.",
    movie:
      "Explore popular movies, share your reactions, and spin up themed wheels for your next watch party.",
    game: "Discover what's trending in gaming right now, vote on your favourites, and create wheels for your next gaming session.",
    character:
      "Explore iconic characters, celebrate fan favorites, and create wheels to spark fun character matchups.",
    custom:
      "Create and explore custom wheels made by the community for any topic imaginable.",
  };

  const label = typeLabels[type] || "Content";
  const description =
    typeDescriptions[type] ||
    "Explore curated content and community-generated wheels.";

  return {
    title: `${label}`,
    description,
  };
}

// ---------- Main Page ----------
export default async function TopicListPage({ params, searchParams }) {
  const type = params.type;
  const page = Math.max(1, parseInt(searchParams?.page || "1"));
  const sort  = searchParams?.sort  || "";
  const genre = searchParams?.genre || "";
  const year  = searchParams?.year  || "";

  let items = [];
  let mobileItems = [];

  // Sort value → API sort parameter mapping
  const animeSortMap = { trending: "TRENDING_DESC", popular: "POPULARITY_DESC", new: "START_DATE_DESC", top: "SCORE_DESC" };
  const movieSortMap = { trending: "popularity.desc", new: "release_date.desc", top: "vote_average.desc" };
  const gameSortMap  = { trending: "-added", new: "-released", top: "-rating" };
  const charSortMap  = { popular: "FAVOURITES_DESC", new: "ID_DESC" };

  if (type === "anime") {
    items = await fetchAnime({ page, genre, year, sort: animeSortMap[sort] || "TRENDING_DESC" });
  }

  if (type === "movie") {
    items = await fetchMovies({ page, genres: genre, year, sortBy: movieSortMap[sort] || "popularity.desc" });
  }

  if (type === "game") {
    const ordering = gameSortMap[sort] || "-added";
    const [general, mobile] = await Promise.all([
      fetchGames({ page, genres: genre, year, page_size: 16, ordering }),
      fetchMobileGames({ page, page_size: 8 }),
    ]);
    items = general;
    const seenIds = new Set(general.map((g) => g.id));
    mobileItems = mobile.filter((g) => !seenIds.has(g.id)).slice(0, 8);
  }

  if (type === "character") {
    items = await fetchCharacters({ page, sort: charSortMap[sort] || "FAVOURITES_DESC" });
  }

  // Hero: first item on page 1 (skip for characters — portrait art looks awkward in wide hero).
  const showHero  = page === 1 && items.length > 0 && type !== "character";
  const heroItem  = showHero ? items[0] : null;
  const gridItems = showHero ? items.slice(1) : items;

  // "Has more" heuristic: if we got a full page, there's probably a next page.
  const hasMore = type === "game" ? items.length >= 16 : items.length >= 20;

  const typeLabels = {
    anime:     "🎌 Discover Anime",
    movie:     "🎬 Discover Movies",
    game:      "🎮 Trending Games",
    character: "🧑‍🤝‍🧑 Discover Characters",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Hero spotlight (page 1 only) ────────────────────────────────── */}
      {heroItem && renderHeroCard(heroItem, type)}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Header row: title + sort tabs + genre pills + search ────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 md:mb-8">
          <h1 className="text-2xl font-bold shrink-0">{typeLabels[type] || "Discover"}</h1>
          <div className="flex-1 min-w-0">
            <FiltersBarWrapper
              genresList={GENRE_PILLS[type] || []}
              type={type}
            />
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {gridItems.length > 0 || mobileItems.length > 0 ? (
          <>
            {type === "game" ? (
              <>
                {/* Console & PC section */}
                {gridItems.length > 0 && (
                  <section className="mb-10">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                      🖥️ Console &amp; PC
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {gridItems.map((item) => renderGameCard(item))}
                    </div>
                  </section>
                )}
                {/* Mobile section */}
                {mobileItems.length > 0 && (
                  <section className="mb-10">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <span className="w-1 h-5 bg-green-500 rounded-full inline-block" />
                      📱 Mobile (Android &amp; iOS)
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {mobileItems.map((item) => renderGameCard(item))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {gridItems.map((item) =>
                  type === "anime"     ? renderAnimeCard(item)
                  : type === "movie"   ? renderMovieCard(item)
                  : type === "character" ? renderCharacterCard(item)
                  : null
                )}
              </div>
            )}

            {/* ── Pagination ── */}
            <div className="mt-10 flex justify-center items-center gap-3">
              {page > 1 && (
                <a
                  href={buildHref(searchParams, { page: page - 1 })}
                  className="px-5 py-2 rounded-full bg-muted hover:bg-accent text-sm font-medium transition"
                >
                  ← Prev
                </a>
              )}
              <span className="text-sm text-muted-foreground px-2">Page {page}</span>
              {hasMore && (
                <a
                  href={buildHref(searchParams, { page: page + 1 })}
                  className="px-5 py-2 rounded-full bg-muted hover:bg-accent text-sm font-medium transition"
                >
                  Next →
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            No {type}s found. Try adjusting your filters.
          </div>
        )}
      </div>
    </div>
  );
}
