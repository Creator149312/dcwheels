import { notFound } from "next/navigation";
import { validateObjectID } from "@utils/Validator";
import { getListByIdCached } from "@lib/lists";
import ListDetailClient from "./ListDetailClient";

// ISR: list data is cached across requests and busted by revalidateTag
// whenever a mutation API route runs. The session/isOwner check is done
// client-side so this page is fully cacheable for guest visitors.
export const revalidate = 604800; // 7 days — tag-busted instantly on mutations

export async function generateMetadata({ params }) {
  const { listId } = params;

  if (!validateObjectID(listId)) {
    return {
      title: "List Not Found",
      description: "The requested list does not exist.",
      robots: "noindex",
    };
  }

  const list = await getListByIdCached(listId);

  if (list) {
    const title = list.name || "User List";
    const description =
      list.description?.trim()?.length > 0
        ? list.description
        : `Explore the list "${list.name}"`;

    return { title, description };
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

  const list = await getListByIdCached(listId);

  if (!list) {
    notFound();
  }

  return (
    <ListDetailClient
      initialList={list}
      listId={listId}
      listOwnerId={list.userId}
    />
  );
}
