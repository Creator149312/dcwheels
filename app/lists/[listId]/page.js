import { cookies } from "next/headers";
import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import ListDetailClient from "./ListDetailClient";
import { getServerSession } from "@node_modules/next-auth";
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
    // ✅ Forward cookies so API can read session
    const cookieStore = cookies();

    const res = await fetch(`${apiConfig.apiUrl}/unifiedlist/${listId}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Cookie: cookieStore.toString(), // ✅ critical for auth
      },
    });

    // ✅ Handle unauthorized
    if (res.status === 401) {
      return {
        title: "Unauthorized",
        description: "You must be logged in to view this list.",
        robots: "noindex",
      };
    }

    // ✅ Handle not found
    if (res.status === 404) {
      return {
        title: "List Not Found",
        description: "The requested list does not exist.",
        robots: "noindex",
      };
    }

    // ✅ Parse list
    const data = await res.json();
    list = data.list || null;
  } catch (err) {
    // ✅ Metadata must never crash the page
    list = null;
  }

  // ✅ If list exists → return metadata
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

  // ✅ Fallback metadata
  return {
    title: "List Not Found",
    description: "The requested list does not exist.",
    robots: "noindex",
  };
}

export default async function ListDetailPage({ params }) {
  const { listId } = params;

  const cookieStore = cookies();

  const res = await fetch(`${apiConfig.apiUrl}/unifiedlist/${listId}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Cookie: cookieStore.toString(),
    },
  });

  if (!res.ok) {
    return (
      <div className="p-6 text-center text-red-500 dark:text-red-400">
        {res.status === 401
          ? "You must be logged in to view this list."
          : "List not found."}
      </div>
    );
  }

  const data = await res.json();
  const list = data.list;

  // ✅ Get logged-in user
  const session = await getServerSession(authOptions);
  const loggedInUserId = await sessionUserId(session?.user?.email || null);

  // ✅ Compare with list.userId
  const isOwner = loggedInUserId === list.userId;
  // console.log("logged In User ID = " + loggedInUserId);

  // console.log("Creator ID = " + list.userId);
  // console.log("Logged In is same as Creator = " + isOwner);
  return (
    <ListDetailClient initialList={list} listId={listId} isOwner={isOwner} />
  );
}
