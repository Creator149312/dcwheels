import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItemsSafe } from "@/lib/feedService";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";
import SearchResultsHeader from "@components/search/SearchResultsHeader";
import SearchTabs from "@components/search/SearchTabs";

const TOPIC_TYPES = {
  topics: null,
  anime: "anime",
  movie: "movie",
  game: "game",
  character: "character",
};

const FEED_PAGE_SIZE = 8;

export default async function Page({ params, searchParams }) {
  await connectMongoDB();

  // Decode and sanitize the search title to prevent any double-encoding display issues
  const rawTitle = params.titlesearch;
  const searchtitle = decodeURIComponent(rawTitle);
  const rawType = searchParams?.type || searchParams?.tab || "top";
  // "posts" tab is merged into "top", normalize to "top" for backwards-compatibility
  const activeType = rawType === "wheel" ? "wheels" : rawType === "posts" ? "top" : rawType;

  let docType = "post,wheel,list";
  let feedType = null;

  if (activeType === "wheels") {
    docType = "wheel";
  } else if (activeType === "lists") {
    docType = "list";
  } else if (Object.prototype.hasOwnProperty.call(TOPIC_TYPES, activeType)) {
    docType = "topic";
    feedType = TOPIC_TYPES[activeType];
  }

  const allItems = await getFeedItemsSafe({
    q: searchtitle,
    type: feedType,
    docType,
    limit: FEED_PAGE_SIZE + 1,
  });

  const items = allItems.slice(0, FEED_PAGE_SIZE);

  let initialNextCursor = null;
  if (docType === "list" || docType === "topic" || docType === "wheel") {
    const nextItem = allItems.length > FEED_PAGE_SIZE ? allItems[FEED_PAGE_SIZE] : null;
    if (nextItem) {
      const scoreOrDate =
        docType === "topic"
          ? nextItem.createdAt
          : nextItem.hotScore ?? nextItem.createdAt;
      initialNextCursor = `${scoreOrDate}|${nextItem._id || nextItem.id}`;
    }
  } else {
    const nextItem =
      allItems.slice(FEED_PAGE_SIZE).find((i) => {
        const dt = i._docType || i.docType;
        return dt !== "list" && dt !== "topic";
      }) || null;
    const hasInjectedSlot = items.some((i) => {
      const dt = i.docType || i._docType;
      return dt === "list" || dt === "topic";
    });
    if (nextItem) {
      initialNextCursor = `${nextItem.hotScore ?? nextItem.createdAt}|${nextItem._id || nextItem.id}|${hasInjectedSlot ? 1 : 0}`;
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-0 py-2 sm:py-6">
      <div className="px-4 sm:px-0">
        <SearchResultsHeader searchtitle={searchtitle} />
        <SearchTabs rawTitle={rawTitle} activeType={activeType} />
      </div>

      <InfiniteFeedStream
        key={`${activeType}-${searchtitle}`}
        initialItems={JSON.parse(JSON.stringify(items))}
        initialNextCursor={initialNextCursor}
        q={searchtitle}
        type={feedType}
        docType={docType}
      />
    </main>
  );
}

