import { cookies } from "next/headers";
import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import ListDetailClient from "./ListDetailClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { sessionUserId } from "@utils/SessionData";

export async function generateMetadata({ params }) {
  const { listId } = params;

  // ✅ Validate ObjectId
  if (!validateObjectID(listId)) {
    return {
      title: "List Not Found",
      description: "The requested list does not exist.",
      robots: "noindex",
    };
  }

  let list = null;

  try {
    const res = await fetch(`${apiConfig.apiUrl}/unifiedlist/${listId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (res.status === 404) {
      return {
        title: "List Not Found",
        description: "The requested list does not exist.",
        robots: "noindex",
      };
    }

    const data = await res.json();
    list = data.list || null;
  } catch (err) {
    list = null;
  }

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

  const res = await fetch(`${apiConfig.apiUrl}/unifiedlist/${listId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div className="p-6 text-center text-red-500 dark:text-red-400">
        {res.status === 404 ? "List not found." : "Failed to load list."}
      </div>
    );
  }

  const data = await res.json();
  const list = data.list;

  // ✅ Get logged-in user (optional)
  const session = await getServerSession(authOptions);
  let loggedInUserId = null;
  if (session?.user?.email) {
    loggedInUserId = await sessionUserId(session.user.email);
  }

  // ✅ Compare with list.userId
  const isOwner = loggedInUserId === list.userId;

  return (
    <ListDetailClient initialList={list} listId={listId} isOwner={isOwner} />
  );
}
