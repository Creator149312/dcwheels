import HomePageContent from "@components/HomePageContent";
import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItemsSafe } from "@/lib/feedService";

// ISR: re-generate at most once per 60 s instead of on every request.
// All users within that window are served from the CDN cache - zero DB hits.
export const revalidate = 60;

const FEED_PAGE_SIZE = 8;

export default async function Home() {
  await connectMongoDB();
  // Fetch initial global feed for SSR hydration
  // Request limit+1 to know if there are more items for pagination
  const allItems = await getFeedItemsSafe({ limit: FEED_PAGE_SIZE + 1 });
  const items = allItems.slice(0, FEED_PAGE_SIZE);
  const nextItem = allItems.slice(FEED_PAGE_SIZE).find((i) => (i._docType || i.docType) !== "list") || null;
  const hasList = items.some(i => i.docType === "list" || i._docType === "list");
  const initialNextCursor = nextItem
    ? `${nextItem.createdAt}|${nextItem._id || nextItem.id}|${hasList ? 1 : 0}`
    : null;

  return (
    <HomePageContent 
      initialGlobalFeed={JSON.parse(JSON.stringify(items))}
      initialGlobalCursor={initialNextCursor}
    />
  );
}