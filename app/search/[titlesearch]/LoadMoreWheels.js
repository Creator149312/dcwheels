"use client";

import { useState } from "react";
import { Card } from "@components/ui/card";
import apiConfig from "@utils/ApiUrlConfig";

const perPage = 10;

export default function LoadMoreWheels({ searchtitle, initialStart, total }) {
  const [wheelList, setWheelList] = useState([]);
  const [start, setStart] = useState(initialStart);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialStart < total);

  const fetchMore = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=${start}&limit=${perPage}`
      );
      const { list } = await res.json();
      setWheelList((prev) => [...prev, ...list]);
      setStart((prev) => prev + perPage);
      setHasMore(start + perPage < total);
    } catch (err) {
      console.error("Failed to load more wheels:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {wheelList.map((item, i) => (
        <a href={`/uwheels/${item._id}`} key={`loadmore-${i}`}>
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

      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={fetchMore}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </>
  );
}
