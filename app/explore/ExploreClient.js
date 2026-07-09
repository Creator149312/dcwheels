"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTransition, useRef } from "react";
import { Compass, Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import EmptyState from "@components/EmptyState";
import ExploreEntityRail from "./ExploreEntityRail";

/**
 * ExploreClient — discovery UI driven entirely by URL searchParams.
 *
 * Why URL state instead of local React state?
 *   - Each mood combo gets its own ISR entry on the server (cache hit on
 *     repeat visits)
 *   - The current mood is shareable / bookmarkable
 *   - Browser back/forward "just works" between mood selections
 *
 * useTransition keeps the chip click responsive — the active chip flips
 * immediately while the new server render streams in.
 */
export default function ExploreClient({
  moods,
  activeMood,
  activeSort,
  trending,
  gridItems,
  games = [],
  anime = [],
  movies = [],
  communityWheels = [],
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const railRef = useRef(null);

  const setMood = (slug) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug && slug !== "trending") params.set("mood", slug);
    else params.delete("mood");
    startTransition(() => {
      router.push(`/explore${params.toString() ? "?" + params.toString() : ""}`, { scroll: false });
    });
  };

  const setSort = (sort) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "recent") params.set("sort", "recent");
    else params.delete("sort");
    startTransition(() => {
      router.push(`/explore${params.toString() ? "?" + params.toString() : ""}`, { scroll: false });
    });
  };

  const scrollRail = (dir) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-3 pb-6 md:px-6 md:pt-4 min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Compass size={22} className="text-primary" />
          <h1 className="text-xl md:text-3xl font-black text-foreground tracking-tight">
            Explore
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Trending wheels & moods for every occasion
        </p>
      </header>

      {/* ── Hero CTA banner ─────────────────────────────────────────────
          High-intent prompt placed above the trending rail (above the fold
          on every viewport). Distinct gradient + arrow affordance so users
          parse it as a banner, not a filter chip. */}
      <Link
        href="/recommendation"
        className="group block mb-6 md:mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 p-4 md:p-5 shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition-all"
      >
        {/* Decorative glow */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-8 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-black text-white leading-tight">
                Can&apos;t decide what to watch?
              </h2>
              <p className="text-xs md:text-sm text-white/85 font-semibold mt-0.5 line-clamp-1">
                Let SpinPapa pick something for you
              </p>
            </div>
          </div>
          <div className="shrink-0 hidden sm:flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full text-white text-xs md:text-sm font-black uppercase tracking-wider transition-colors group-hover:translate-x-1">
            Surprise me
            <ChevronRight size={16} />
          </div>
          <ChevronRight size={20} className="sm:hidden shrink-0 text-white group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* ── Trending strip ─────────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="flex items-center gap-1.5 text-sm md:text-base font-black text-foreground uppercase tracking-wider">
              <Sparkles size={16} className="text-amber-500" />
              Trending now
            </h2>
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scrollRail(-1)}
                className="p-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollRail(1)}
                className="p-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={railRef}
            className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {trending.map((item, i) => (
              <Link
                key={item._id}
                href={`/wheels/${item.slug}`}
                className="snap-start shrink-0 w-[150px] md:w-[180px] group"
              >
                <div className="relative aspect-square w-full bg-muted/40 rounded-2xl overflow-hidden border border-border group-hover:border-primary/50 transition-all">
                  {/* Rank badge */}
                  <div className="absolute top-2 left-2 z-10 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                    {i + 1}
                  </div>
                  {item.wheelPreview ? (
                    <img
                      src={item.wheelPreview}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-muted-foreground/40">
                      {item.title?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="mt-2 text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight px-0.5">
                  {item.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Entity rails ───────────────────────────────────────────────── */}
      <div className="mt-4 pt-2">
        <div className="mb-4">
          <h2 className="text-base md:text-xl font-black text-foreground">
            Trending in pop culture
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Hot games, anime and movies — perfect material for your next decision wheel
          </p>
        </div>

        <ExploreEntityRail
          title="Trending Games"
          emoji="🎮"
          items={games}
          viewAllHref="/game"
          accentColor="text-emerald-500"
        />
        <ExploreEntityRail
          title="Trending Anime"
          emoji="🌸"
          items={anime}
          viewAllHref="/anime"
          accentColor="text-pink-500"
        />
        <ExploreEntityRail
          title="Trending Movies"
          emoji="🎬"
          items={movies}
          viewAllHref="/movie"
          accentColor="text-amber-500"
        />
      </div>

      {/* ── Mood chips ─────────────────────────────────────────────────── */}
      {/* Moved down here because it helps in filtering the grid below */}
      <div className="mt-10 pt-8 border-t border-border">
        <div className="bg-background/95 -mx-4 md:-mx-6 px-4 md:px-6 py-2 mb-4 border-b border-border">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {moods.map((m) => {
              const active = m.slug === activeMood || (activeMood === "trending" && m.slug === "trending");
              return (
                <button
                  key={m.slug}
                  onClick={() => setMood(m.slug)}
                  disabled={isPending && active}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sort toggle ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-base font-black text-foreground uppercase tracking-wider">
          {activeMood === "trending" || activeMood === "all"
            ? "Popular wheels"
            : `${moods.find((m) => m.slug === activeMood)?.label} wheels`}
        </h2>
        <div className="flex items-center gap-1 bg-muted rounded-full p-0.5 text-[11px] font-bold">
          <button
            onClick={() => setSort("trending")}
            className={`px-3 py-1 rounded-full transition ${
              activeSort !== "recent"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSort("recent")}
            className={`px-3 py-1 rounded-full transition ${
              activeSort === "recent"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            New
          </button>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {gridItems.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            icon={Compass}
            title="No wheels in this mood yet"
            description="Try a different chip — or be the first to create one."
            action={{ label: "Create a wheel", href: "/" }}
          />
        </div>
      ) : (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 transition-opacity ${
            isPending ? "opacity-60" : "opacity-100"
          }`}
        >
          {gridItems.map((item) => (
            <Link
              key={item._id}
              href={`/wheels/${item.slug}`}
              className="group flex flex-col bg-muted/40 rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all active:scale-[0.98] hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full bg-muted flex items-center justify-center border-b border-border overflow-hidden">
                {item.wheelPreview ? (
                  <img
                    src={item.wheelPreview}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <span className="text-muted-foreground/40 text-5xl font-black group-hover:scale-110 transition-transform duration-500">
                    {item.title?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="p-2 md:p-3">
                  <h3 className="text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight">
                  {item.title}
                </h3>
                {item.likeCount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                    ♥ {item.likeCount}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {isPending && (
        <div className="flex justify-center mt-6">
          <Loader2 className="animate-spin text-primary" size={20} />
        </div>
      )}
    </div>
  );
}
