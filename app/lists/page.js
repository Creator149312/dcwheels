// app/lists/page.js
import apiConfig from "@utils/ApiUrlConfig";
import ListsClient from "./ListsClient";
import { cookies } from "next/headers";

// app/lists/page.js

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
  const cookieStore = cookies();

  const res = await fetch(`${apiConfig.apiUrl}/unifiedlist/all?limit=20&skip=0`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Cookie: cookieStore.toString(),
    },
  });

  const data = await res.json();
  const lists = data.lists || [];

  return <ListsClient initialLists={lists} />;
}
