// app/wheels/page.js
import apiConfig from "@utils/ApiUrlConfig";
import WheelsClient from "./WheelClient";
import { cookies } from "next/headers";

export const metadata = {
  title: "All Wheels",
  description: "Browse all wheels created across the platform.",
  openGraph: {
    title: "All Wheels",
    description: "Explore user-created wheels.",
    url: "/wheels",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Wheels",
    description: "Explore user-created wheels.",
  },
};

export default async function WheelsPage() {
  const cookieStore = cookies();

  const res = await fetch(
    `${apiConfig.apiUrl}/page/all?limit=20&skip=0`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Cookie: cookieStore.toString(),
      },
    }
  );

  const data = await res.json();
  const wheels = data.wheels || [];

  return <WheelsClient initialWheels={wheels} />;
}
