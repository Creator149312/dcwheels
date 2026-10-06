import FiltersBarWrapper from "./FiltersBarWrapper";
import {
  renderAnimeCard,
  renderCharacterCard,
  renderGameCard,
  renderMovieCard,
  renderHeroCard,
  GENRE_PILLS,
} from "./TopicPagesHelperFunctions";

function buildHref(sp, updates = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp || {})) {
    if (k !== "page" && v) p.set(k, String(v));
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v != null && String(v) !== "") p.set(k, String(v));
    else p.delete(k);
  }
  // Keep tab=browse
  p.set("tab", "browse");
  return `?${p.toString()}`;
}

export default function CategoryCatalogView({
  type,
  items = [],
  mobileItems = [],
  page = 1,
  hasMore = false,
  apiUnavailable = false,
  resolvedSearchParams = {},
}) {
  const showHero = page === 1 && items.length >= 6 && type !== "character";
  const heroItem = showHero ? items[0] : null;
  const gridItems = showHero ? items.slice(1) : items;

  return (
    <div className="w-full">
      {/* ── Hero spotlight (page 1 only) ────────────────────────────────── */}
      {heroItem && (
        <div className="mb-6 rounded-2xl overflow-hidden">
          {renderHeroCard(heroItem, type)}
        </div>
      )}

      {/* ── Filters bar ────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-lg font-bold">All {type === "movie" ? "Movies" : type === "game" ? "Games" : type === "anime" ? "Anime" : "Characters"}</h2>
        <div className="flex-1 min-w-0 sm:max-w-md ml-auto">
          <FiltersBarWrapper
            genresList={GENRE_PILLS[type] || []}
            type={type}
          />
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {gridItems.length > 0 || mobileItems.length > 0 ? (
        <>
          {type === "game" ? (
            <>
              {/* Console & PC section */}
              {gridItems.length > 0 && (
                <section className="mb-10">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                    🖥️ Console &amp; PC
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {gridItems.map((item) => renderGameCard(item))}
                  </div>
                </section>
              )}
              {/* Mobile section */}
              {mobileItems.length > 0 && (
                <section className="mb-10">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-green-500 rounded-full inline-block" />
                    📱 Mobile (Android &amp; iOS)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {mobileItems.map((item) => renderGameCard(item))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {gridItems.map((item) =>
                type === "anime"
                  ? renderAnimeCard(item)
                  : type === "movie"
                  ? renderMovieCard(item)
                  : type === "character"
                  ? renderCharacterCard(item)
                  : null
              )}
            </div>
          )}

          {/* ── Pagination ── */}
          <div className="mt-10 flex justify-center items-center gap-3">
            {page > 1 && (
              <a
                href={buildHref(resolvedSearchParams, { page: page - 1 })}
                className="px-5 py-2 rounded-full bg-muted hover:bg-accent text-sm font-medium transition"
              >
                ← Prev
              </a>
            )}
            <span className="text-sm text-muted-foreground px-2">Page {page}</span>
            {hasMore && (
              <a
                href={buildHref(resolvedSearchParams, { page: page + 1 })}
                className="px-5 py-2 rounded-full bg-muted hover:bg-accent text-sm font-medium transition"
              >
                Next →
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          {apiUnavailable ? (
            <>
              <p className="text-lg font-medium mb-2">Service temporarily unavailable</p>
              <p className="text-sm">The data provider is currently experiencing issues. Please check back shortly.</p>
            </>
          ) : (
            `No ${type}s found. Try adjusting your filters.`
          )}
        </div>
      )}

      {apiUnavailable && items.length > 0 && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-medium text-center">
          Showing local results while the external service is down. Filters may not apply.
        </div>
      )}
    </div>
  );
}
