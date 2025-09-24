import LoadMoreWheels from "./LoadMoreWheels";
import { Card } from "@components/ui/card";
import apiConfig from "@utils/ApiUrlConfig";

const perPage = 10;

async function fetchInitialWheels(searchtitle) {
  const res = await fetch(
    `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=0&limit=${perPage}`,
    { next: { revalidate: 360000 } }
  );
  if (!res.ok) throw new Error("Failed to fetch wheels");
  return await res.json();
}

export async function generateMetadata({ params }) {
  const searchtitle = params.titlesearch;
  try {
    // const { list } = await fetchInitialWheels(searchtitle);
    return {
      title: `S${searchtitle} Wheels`,
      description: `Explore the list of spin wheels related to ${searchtitle}.`,
    };
  } catch {
    return {
      title: "No Wheels Found",
      description: "No Wheels Found",
    };
  }
}

export default async function Page({ params }) {
  const searchtitle = params.titlesearch;
  let list = [];
  let total = 0;

  try {
    const data = await fetchInitialWheels(searchtitle);
    list = data.list;
    total = data.total;
  } catch {
    list = [];
  }

  return (
    <div className="m-3 p-3">
      <h1 className="text-xl font-semibold mb-4">
        Search Results: {searchtitle}
      </h1>

      {list.length === 0 ? (
        <div className="text-center mt-6">
          <p className="text-gray-700 dark:text-gray-300">
            We cannot find any wheels related to <strong>{searchtitle}</strong>.
          </p>
          <div className="mt-4">
            <a
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Create a New Wheel
            </a>
          </div>
        </div>
      ) : (
        <>
          {list.map((item, i) => (
            <a href={`/uwheels/${item._id}`} key={i}>
              <Card
                className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800 
                  hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 
                  transition-all duration-300 ease-in-out 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                tabIndex={0}
              >
                <div className="text-base leading-normal flex justify-between items-center">
                  <div className="w-[80%]">
                    <h2 className="font-medium mb-1">{item.title}</h2>
                  </div>
                  <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full font-semibold">
                    {item.data.length}
                  </span>
                </div>
              </Card>
            </a>
          ))}

          <LoadMoreWheels
            searchtitle={searchtitle}
            initialStart={perPage}
            total={total}
          />
        </>
      )}
    </div>
  );
}
