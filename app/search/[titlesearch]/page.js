import { Suspense } from "react";
import TopicSection from "./TopicSection";
import WheelsSection from "./WheelsSection";
import WheelsSectionSkeleton from "./WheelsSectionSkeleton";
import SearchResultsHeader from "@components/search/SearchResultsHeader";
import SearchTabs from "@components/search/SearchTabs";
import { fetchLocalTopics } from "./fetchLocalTopics";

const perPage = 8;

const TOPIC_TYPES = {
  anime: { label: "anime" },
  movie: { label: "movie" },
  game: { label: "game" },
  character: { label: "character", badgeType: "heart" },
};

export default async function Page({ params, searchParams }) {
  // Decode and sanitize the search title to prevent any double-encoding display issues
  const rawTitle = params.titlesearch;
  const searchtitle = decodeURIComponent(rawTitle);
  const activeType = searchParams?.type || "wheels";

  // Only fetch data for the active tab on initial SSR. The local-first topic
  // endpoint returns normalized results and already includes an external API
  // fallback, so page.js no longer needs to call AniList/TMDB/RAWG directly.
  let wheelData = { list: [], total: 0 };
  let topicData = { results: [], meta: { total: 0 } };

  if (activeType === "wheels") {
    wheelData = await fetchInitialWheels(searchtitle);
  } else if (TOPIC_TYPES[activeType]) {
    topicData = await fetchLocalTopics({ q: searchtitle, type: activeType });
  }

  const wheelList = wheelData.list || [];
  const wheelTotal = wheelData.total || 0;

  // Counts for tab labels use the endpoint's total so they reflect the full
  // local result set, not just the first page.
  const counts = {
    wheels: wheelTotal,
    anime: 0,
    movie: 0,
    game: 0,
    character: 0,
    [activeType]: topicData.meta?.total || 0,
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 pb-10">

      <SearchResultsHeader searchtitle={searchtitle} />
      <SearchTabs rawTitle={rawTitle} activeType={activeType} counts={counts} />

      {/* Wheels tab */}
      {activeType === "wheels" && (
        <Suspense fallback={<WheelsSectionSkeleton count={perPage} />}>
          <WheelsSection
            searchtitle={searchtitle}
            wheelList={wheelList}
            wheelTotal={wheelTotal}
            initialStart={perPage}
          />
        </Suspense>
      )}

      {/* Content tabs */}
      {TOPIC_TYPES[activeType] && (
        <Suspense fallback={<ContentSkeleton />}>
          <TopicSection
            searchtitle={searchtitle}
            type={activeType}
            label={TOPIC_TYPES[activeType].label}
            initialData={topicData}
            badgeType={TOPIC_TYPES[activeType].badgeType}
          />
        </Suspense>
      )}

      {/* Show skeleton instantly while client-side tab navigation is loading */}
      {!TOPIC_TYPES[activeType] && activeType !== "wheels" && <ContentSkeleton />}

    </div>
  );
}

async function fetchInitialWheels(searchtitle) {
  const { default: apiConfig } = await import("@utils/ApiUrlConfig");
  const res = await fetch(
    `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=0&limit=${perPage}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error("Failed to fetch wheels");
  return res.json();
}

// Shown while a content section is loading (Suspense boundary)
function ContentSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-muted rounded-lg md:rounded-xl aspect-[3/4] mb-2" />
          <div className="h-3 bg-muted rounded mb-1 w-3/4" />
          <div className="h-2.5 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
