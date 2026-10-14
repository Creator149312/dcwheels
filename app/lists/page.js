import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItemsSafe } from "@/lib/feedService";
import ListsFeed from "@components/lists/ListsFeed";

export const metadata = {
  title: "Discover Lists — SpinPapa",
  description: "Explore curated lists of movies, anime, games, characters and more.",
  openGraph: {
    title: "Discover Lists",
    description: "Explore curated lists of movies, anime, games, characters and more.",
    url: "/lists",
    type: "website",
  },
};

const LISTS_PAGE_SIZE = 9;

export default async function ListsPage() {
  await connectMongoDB();

  const allItems = await getFeedItemsSafe({
    docType: "list",
    limit: LISTS_PAGE_SIZE + 1,
  });

  const items = allItems.slice(0, LISTS_PAGE_SIZE);
  const nextItem = allItems.length > LISTS_PAGE_SIZE ? allItems[LISTS_PAGE_SIZE] : null;
  const initialNextCursor = nextItem
    ? `${nextItem.hotScore ?? nextItem.createdAt}|${nextItem._id || nextItem.id}`
    : null;

  return (
    <main className="mx-auto max-w-2xl px-0 py-2 sm:py-6">
      <div className="px-4 sm:px-0 mb-4">
        <h1 className="text-xl sm:text-2xl font-black">Discover Lists</h1>
        <p className="text-sm text-muted-foreground">
          Curated collections from the community.
        </p>
      </div>
      <ListsFeed
        initialItems={JSON.parse(JSON.stringify(items))}
        initialCursor={initialNextCursor}
      />
    </main>
  );
}

