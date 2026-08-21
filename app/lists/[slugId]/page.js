import { notFound, permanentRedirect } from "next/navigation";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { getListByIdCached } from "@lib/lists";
import ListDetailClient from "./ListDetailClient";
import { getListUrl } from "@utils/UrlHandler";

// ISR: list data is cached across requests and busted by revalidateTag
// whenever a mutation API route runs. Public lists remain cacheable; private
// lists trigger a server-side ownership check which makes that request dynamic.
export const revalidate = 604800; // 7 days — tag-busted instantly on mutations

export async function generateMetadata({ params }) {
  const { slugId } = await params;
  const list = await getListByIdCached(slugId);

  if (!list || list.isDeleted) {
    return {
      title: "List Not Found",
      description: "The requested list does not exist.",
      robots: "noindex",
    };
  }

  const isPublic = list.isPublic ?? true;

  // Privacy check: private lists are only visible to their owner.
  if (!isPublic && !list.isSystem) {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id ? String(session.user.id) : null;
    const listUserId = list.userId ? String(list.userId) : null;
    if (!sessionUserId || !listUserId || sessionUserId !== listUserId) {
      return {
        title: "List Not Found",
        description: "The requested list does not exist.",
        robots: "noindex",
      };
    }
  }

  const title = list.name ? `${list.name}` : "User List";
  const description =
    list.description?.trim()?.length > 0
      ? list.description
      : `Explore the list "${list.name}"`;

  const isIndexed = list.indexed && isPublic && !list.isSystem;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.spinpapa.com${getListUrl(list)}`,
    },
    robots: {
      index: !!isIndexed,
      follow: true,
    },
  };
}

export default async function ListDetailPage({ params }) {
  const { slugId } = await params;
  const list = await getListByIdCached(slugId);

  if (!list || list.isDeleted) {
    notFound();
  }

  const isPublic = list.isPublic ?? true;

  // Privacy check: private lists are only visible to their owner.
  if (!isPublic && !list.isSystem) {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id ? String(session.user.id) : null;
    const listUserId = list.userId ? String(list.userId) : null;
    if (!sessionUserId || !listUserId || sessionUserId !== listUserId) {
      notFound();
    }
  }

  const canonicalUrl = getListUrl(list);
  const rawPath = `/lists/${slugId}`;

  // If list has a different canonical URL, redirect to it.
  if (canonicalUrl !== "#" && rawPath !== canonicalUrl) {
    permanentRedirect(canonicalUrl);
  }

  return (
    <ListDetailClient
      initialList={list}
      listId={list.id}
      listOwnerId={list.userId}
    />
  );
}
