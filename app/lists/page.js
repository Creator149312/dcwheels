// app/lists/page.js
import { Suspense } from "react";
import ListsClient from "./ListsClient";
import { getPublicLists } from "@lib/lists";

// Public browse page — fully cacheable. Lists aren't edit-hot so 5 min ISR
// is plenty; /lists/[listId] detail pages use their own revalidation.
export const revalidate = 300;

export const metadata = {
  title: "All Lists",
  description: "Browse all user-created lists across the platform.",
  openGraph: {
    title: "All Lists",
    description: "Explore collections created by users.",
    url: "/lists",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Lists",
    description: "Explore collections created by users.",
  },
};


export default async function ListsPage() {
  const lists = await getPublicLists({ limit: 20, skip: 0 });
  return (
    <Suspense fallback={null}>
      <ListsClient initialLists={lists} />
    </Suspense>
  );
}
