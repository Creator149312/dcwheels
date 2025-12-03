import Link from "next/link";
import LoadMoreWheels from "./LoadMoreWheels";
import { Card } from "@components/ui/card";
import apiConfig from "@utils/ApiUrlConfig";
// import AnimeSection from "./AnimeSection";
// import GameSection from "./GameSection";

const perPage = 10;

async function fetchInitialWheels(searchtitle) {
  const res = await fetch(
    `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=0&limit=${perPage}`,
    {
      // cache results for 1 hour, avoids repeated fetches
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch wheels");
  return res.json();
}

export async function generateMetadata({ params }) {
  const searchtitle = params.titlesearch;
  try {
    const { total } = await fetchInitialWheels(searchtitle);
    return {
      title: `Search: ${searchtitle}`,
      description: `Explore spin wheels related to ${searchtitle}.`,
    };
  } catch {
    return {
      title: "No Wheels Found",
      description: "No Wheels Found",
    };
  }
}

export default async function Page({ params }) {
  const searchtitle = decodeURIComponent(params.titlesearch);

  let list = [];
  let total = 0;

  try {
    const data = await fetchInitialWheels(searchtitle);
    list = data.list || [];
    total = data.total || 0;
  } catch {
    list = [];
  }

  if (list.length === 0) {
    return (
      <div className="text-center mt-6">
        <p className="text-gray-700 dark:text-gray-300">
          We cannot find any wheels related to <strong>{searchtitle}</strong>.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Create a New Wheel
          </Link>
        </div>
      </div>
    );
  }

  // Pre-slice once for clarity
  const firstFive = list.slice(0, 5);
  const remaining = list.slice(5);

  return (
    <div className="m-3 p-3">
      <h1 className="text-xl font-semibold mb-4">
        Search Results: {searchtitle}
      </h1>

      {/* First 5 wheels */}
      {firstFive.map((item) => (
        <Link href={`/uwheels/${item._id}`} key={item._id}>
          <Card
            className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800 
              hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 
              transition-all duration-300 ease-in-out 
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex justify-between items-center">
              <div className="w-[80%]">
                <h2 className="font-medium mb-1">{item.title}</h2>
              </div>
              <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full font-semibold">
                {item.data.length}
              </span>
            </div>
          </Card>
        </Link>
      ))}

      {/* Anime section could be streamed later if needed */}
      {/* <Suspense fallback={<p>Loading anime…</p>}>
        <AnimeSection searchtitle={searchtitle} />
      </Suspense> */}

      {/* Remaining wheels */}
      {remaining.map((item) => (
        <Link href={`/uwheels/${item._id}`} key={item._id}>
          <Card
            className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800 
              hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 
              transition-all duration-300 ease-in-out 
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex justify-between items-center">
              <div className="w-[80%]">
                <h2 className="font-medium mb-1">{item.title}</h2>
              </div>
              <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full font-semibold">
                {item.data.length}
              </span>
            </div>
          </Card>
        </Link>
      ))}

      {/* Game section could be streamed later if needed */}
      {/* <Suspense fallback={<p>Loading games…</p>}>
        <GameSection searchtitle={searchtitle} />
      </Suspense> */}

      {/* Load more wheels */}
      <LoadMoreWheels
        searchtitle={searchtitle}
        initialStart={perPage}
        total={total}
      />
    </div>
  );
}
