import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItemsSafe } from "@/lib/feedService";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

export const metadata = {
  title: "Discover Wheels — SpinPapa",
  description: "Browse and spin community-created decision wheels.",
  openGraph: {
    title: "Discover Wheels — SpinPapa",
    description: "Browse and spin community-created decision wheels.",
    url: "/wheels",
    type: "website",
  },
};

const WHEELS_PAGE_SIZE = 8;

export default async function WheelsPage() {
  await connectMongoDB();

  const allItems = await getFeedItemsSafe({
    docType: "wheel",
    limit: WHEELS_PAGE_SIZE + 1,
  });

  const items = allItems.slice(0, WHEELS_PAGE_SIZE);
  const nextItem = allItems.length > WHEELS_PAGE_SIZE ? allItems[WHEELS_PAGE_SIZE] : null;
  const initialNextCursor = nextItem
    ? `${nextItem.createdAt}|${nextItem._id || nextItem.id}`
    : null;

  return (
    <main className="mx-auto max-w-3xl px-0 py-2 sm:py-6">
      <div className="px-4 sm:px-0 mb-4">
        <h1 className="text-xl sm:text-2xl font-black">Discover Wheels</h1>
        <p className="text-sm text-muted-foreground">
          Ready-to-spin decision wheels created by the community.
        </p>
      </div>
      <InfiniteFeedStream
        initialItems={JSON.parse(JSON.stringify(items))}
        initialNextCursor={initialNextCursor}
        docType="wheel"
      />
    </main>
  );
}
