import LoadMoreWheels from "./LoadMoreWheels";
import { Card } from "@components/ui/card";
import apiConfig from "@utils/ApiUrlConfig";
import { Fragment, Suspense } from "react";
import Link from "next/link";
import { Search, ArrowRight, Layers, Sparkles, Plus } from "lucide-react";
import AdsUnit from "@components/ads/AdsUnit";
import AnimeSection from "./AnimeSection";
import MovieSection from "./MovieSection";
import GameSection from "./GameSection";
import CharacterSection from "./CharacterSection";

const perPage = 10;

// Tab definitions — order controls display order
const TABS = [
  { key: "wheels",    label: "🎡 Wheels",    title: "Spin Wheels" },
  { key: "anime",     label: "✨ Anime",      title: "Anime" },
  { key: "movie",     label: "🎬 Movies",    title: "Movies" },
  { key: "game",      label: "🎮 Games",     title: "Games" },
  { key: "character", label: "👤 Characters", title: "Characters" },
];

async function fetchInitialWheels(searchtitle) {
  const res = await fetch(
    `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=0&limit=${perPage}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error("Failed to fetch wheels");
  return res.json();
}

export default async function Page({ params, searchParams }) {
  const searchtitle = decodeURIComponent(params.titlesearch);
  const activeType = searchParams?.type || "wheels";

  // Always fetch the wheel search result — cheap and cached (s-maxage=300),
  // and lets us surface the wheel count in the tab bar even when the user
  // is viewing a non-wheel tab ("Wheels (8)"). Improves discovery without
  // adding rendering cost per tab switch.
  let list = [];
  let total = 0;
  try {
    const data = await fetchInitialWheels(searchtitle);
    list = data.list || [];
    total = data.total || 0;
  } catch {
    list = [];
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-10">

      {/* Header */}
      <header className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-primary">
            Search Results
          </span>
        </div>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
          Results for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
            {searchtitle}
          </span>
        </h1>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6 [&::-webkit-scrollbar]:hidden"
           style={{ scrollbarWidth: "none" }}>
        {TABS.map((tab) => {
          const isActive = activeType === tab.key;
          const href =
            tab.key === "wheels"
              ? `/search/${encodeURIComponent(params.titlesearch)}`
              : `/search/${encodeURIComponent(params.titlesearch)}?type=${tab.key}`;
          // Surface wheel count inline — "🎡 Wheels (8)" — so visitors on
          // other tabs can see there are wheel results without switching.
          const label =
            tab.key === "wheels" && total > 0 ? `${tab.label} (${total})` : tab.label;
          return (
            <Link
              key={tab.key}
              href={href}
              prefetch={false}
              scroll={false}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Wheels tab */}
      {activeType === "wheels" && (
        <>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative bg-card border border-border p-6 rounded-3xl shadow-xl">
                  <Search className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-black text-foreground mb-2">
                No wheels found
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs mb-8">
                No spin wheels match{" "}
                <span className="font-semibold text-foreground">{searchtitle}</span>.
                Try searching anime, movies or games above.
              </p>
              <a
                href="/"
                className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-2xl font-bold hover:scale-105 transition shadow-xl active:scale-95 text-sm"
              >
                <Plus size={16} />
                Create Custom Wheel
              </a>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4 font-medium">
                Found {total} spin wheel{total !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {list.map((item, index) => (
                  <Fragment key={item._id}>
                    <Link href={`/uwheels/${item._id}`} className="group">
                      <Card className="group relative overflow-hidden border-none bg-card shadow-sm p-3.5 md:p-6 transition duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:from-primary/5 transition-colors duration-500" />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
                            <div className="relative flex-shrink-0 h-11 w-11 md:h-14 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-12 transition duration-300">
                              <Layers size={20} className="md:w-6 md:h-6" />
                            </div>
                            <div className="truncate">
                              <h2 className="text-base md:text-xl font-bold text-foreground truncate mb-0.5 md:mb-1">
                                {item.title}
                              </h2>
                              <span className="px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                                {item.data.length} Segments
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            <div className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center rounded-full border border-border group-hover:bg-primary group-hover:border-primary transition">
                              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary-foreground group-hover:translate-x-0.5 transition" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                    {(index + 1) % 5 === 0 && <AdsUnit slot={"4694567949"} />}
                  </Fragment>
                ))}
              </div>
              <div className="mt-10 md:mt-16 flex justify-center">
                <LoadMoreWheels
                  searchtitle={searchtitle}
                  initialStart={perPage}
                  total={total}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Content tabs — each fetches only its own API */}
      {activeType === "anime" && (
        <Suspense fallback={<ContentSkeleton />}>
          <AnimeSection searchtitle={searchtitle} />
        </Suspense>
      )}
      {activeType === "movie" && (
        <Suspense fallback={<ContentSkeleton />}>
          <MovieSection searchtitle={searchtitle} />
        </Suspense>
      )}
      {activeType === "game" && (
        <Suspense fallback={<ContentSkeleton />}>
          <GameSection searchtitle={searchtitle} />
        </Suspense>
      )}
      {activeType === "character" && (
        <Suspense fallback={<ContentSkeleton />}>
          <CharacterSection searchtitle={searchtitle} />
        </Suspense>
      )}

    </div>
  );
}

// Shown while a content section is loading (Suspense boundary)
function ContentSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 dark:bg-gray-800 rounded-xl aspect-[3/4] mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded mb-1 w-3/4" />
          <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}