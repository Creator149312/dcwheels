import { notFound } from "next/navigation";
import { validateObjectID } from "@utils/Validator";
import { getListById } from "@lib/lists";
import ListDetailClient from "./ListDetailClient";

// Public list detail is CDN-cacheable for a minute. Owner-only UI bits are
// resolved client-side via useSession() in ListDetailClient.
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { listId } = params;

  if (!validateObjectID(listId)) {
    return {
      title: "List Not Found",
      description: "The requested list does not exist.",
      robots: "noindex",
    };
  }

  // React.cache() dedupes this with the page body's call below — one DB hit.
  const list = await getListById(listId);

  if (list) {
    const title = list.name || "User List";
    const description =
      list.description?.trim()?.length > 0
        ? list.description
        : `Explore the list "${list.name}"`;

    return {
      title,
      description,
    };
  }

  return {
    title: "List Not Found",
    description: "The requested list does not exist.",
    robots: "noindex",
  };
}

export default async function ListDetailPage({ params }) {
  const { listId } = params;

  if (!validateObjectID(listId)) {
    notFound();
  }

  const list = await getListById(listId);

  if (!list) {
    notFound();
  }

  // Owner check moved to client (useSession in ListDetailClient) so this
  // page remains CDN-cacheable for anonymous and authenticated users alike.
  return <ListDetailClient initialList={list} listId={listId} />;
}
