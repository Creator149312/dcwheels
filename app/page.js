import HomePageContent from "@components/HomePageContent";
import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItems } from "@/lib/feedService";

// ISR: re-generate at most once per 60 s instead of on every request.
// All users within that window are served from the CDN cache - zero DB hits.
export const revalidate = 60;

export default async function Home() {
  await connectMongoDB();
  // Fetch initial global feed for SSR hydration
  // Request limit+1 to know if there are more items for pagination
  const allItems = await getFeedItems({ limit: 9 });
  const items = allItems.slice(0, 8); // Return only 8 to user
  const initialNextCursor = allItems.length > 8 ? allItems[7].createdAt : null; // Cursor to 9th item if exists

  return (
    <HomePageContent 
      initialGlobalFeed={JSON.parse(JSON.stringify(items))}
      initialGlobalCursor={initialNextCursor}
    />
  );
}