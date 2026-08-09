"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { Compass, ChevronRight, Sparkles, Loader2 } from "lucide-react";

/**
 * ExploreClient — instant shell for /explore.
 *
 * All heavy data (trending rail, entity rails, mood grid) is fetched inside
 * async server components that are wrapped in <Suspense> by the parent page.
 * This means navigation to /explore renders the shell immediately while the
 * data streams in, so the bottom-nav tap never feels stuck.
 *
 * URL state (mood / sort) is used instead of local state so each combo gets
 * its own ISR entry and is shareable. useTransition keeps the chip tap
 * responsive while the RSC payload loads.
 */
export default function ExploreClient({
  moods,
  activeMood,
  activeSort,
  trendingSlot,
  entitySlot,
  gridSlot,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
    if (sort === "recent") params.set("sort", sort);
    else params.delete("sort");
    startTransition(() => {
      router.push(`/explore${params.toString() ? "?" + params.toString() : ""}`, { scroll: false });
    });
  };

  const gridTitle =
    activeMood === "trending" || activeMood === "all"
      ? "Popular wheels"
      : `${moods.find((m) => m.slug === activeMood)?.label} wheels`;

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

      {/* ── Hero CTA banner ───────────────────────────────────────────── */}
      <Link
        href="/recommendation"
        className="group block mb-6 md:mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 p-4 md:p-5 shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition-all"
      >
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

      {/* ── Trending strip (streamed) ──────────────────────────────────── */}
      {trendingSlot}

      {/* ── Entity rails (streamed) ────────────────────────────────────── */}
      {entitySlot}

      {/* ── Mood chips ─────────────────────────────────────────────────── */}
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
          {gridTitle}
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

      {/* ── Grid (streamed) ────────────────────────────────────────────── */}
      <div className={isPending ? "opacity-60 transition-opacity" : "opacity-100 transition-opacity"}>
        {gridSlot}
      </div>

      {isPending && (
        <div className="flex justify-center mt-6">
          <Loader2 className="animate-spin text-primary" size={20} />
        </div>
      )}
    </div>
  );
}

// Lightweight skeletons used as Suspense fallbacks by the parent page.
export function TrendingSkeleton() {
  return (
    <section className="mb-6 md:mb-8">
      <div className="h-5 w-32 bg-muted/60 animate-pulse rounded mb-3" />
      <div className="flex gap-3 overflow-x-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="shrink-0 w-[150px] md:w-[180px]">
            <div className="aspect-square w-full bg-muted/50 animate-pulse rounded-2xl" />
            <div className="h-3 w-24 bg-muted/50 animate-pulse rounded mt-2" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EntitySkeleton() {
  return (
    <div className="mt-4 pt-2 space-y-6">
      <div className="h-5 w-40 bg-muted/60 animate-pulse rounded" />
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div className="h-4 w-28 bg-muted/50 animate-pulse rounded mb-2" />
          <div className="flex gap-3 overflow-x-hidden">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="shrink-0 w-[120px] md:w-[150px]">
                <div className="aspect-[2/3] w-full bg-muted/50 animate-pulse rounded-xl" />
                <div className="h-3 w-20 bg-muted/50 animate-pulse rounded mt-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex flex-col bg-muted/30 rounded-xl overflow-hidden">
          <div className="aspect-[4/3] w-full bg-muted/50 animate-pulse" />
          <div className="p-2 md:p-3 space-y-2">
            <div className="h-3 w-full bg-muted/50 animate-pulse rounded" />
            <div className="h-3 w-2/3 bg-muted/50 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
