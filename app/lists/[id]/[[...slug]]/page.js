import { notFound } from "next/navigation";
import { validateObjectID } from "@utils/Validator";
import { getListByIdCached } from "@lib/lists";
import ListDetailClient from "./ListDetailClient";
import { getListUrl } from "@utils/UrlHandler";

// ISR: list data is cached across requests and busted by revalidateTag
// whenever a mutation API route runs. The session/isOwner check is done
// client-side so this page is fully cacheable for guest visitors.
export const revalidate = 604800; // 7 days — tag-busted instantly on mutations

export async function generateMetadata({ params }) {
  const { id } = await params;

  if (!validateObjectID(id)) {
    return {
      title: "List Not Found",
      description: "The requested list does not exist.",
      robots: "noindex",
    };
  }

  const list = await getListByIdCached(id);

  if (list) {
    const title = list.name ? `${list.name} — List` : "User List";
    const description =
      list.description?.trim()?.length > 0
        ? list.description
        : `Explore the list "${list.name}"`;

    const isIndexed = list.isPublic && !list.isDeleted && list.indexed;

    return {
      title,
      description,
      alternates: {
        canonical: `https://www.spinpapa.com${getListUrl(list)}`,
      },
      robots: {
        index: !!isIndexed,
        follow: true,
      }
    };
  }

  return {
    title: "List Not Found",
    description: "The requested list does not exist.",
    robots: "noindex",
  };
}

export default async function ListDetailPage({ params }) {
  const { id } = await params;

  if (!validateObjectID(id)) {
    notFound();
  }

  const list = await getListByIdCached(id);

  if (!list) {
    notFound();
  }

  return (
    <ListDetailClient
      initialList={list}
      listId={id}
      listOwnerId={list.userId}
    />
  );
}
