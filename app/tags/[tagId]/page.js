"use client";

/* in future I would make it a server side component along with indexing enabled */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WheelCard from "@app/test/TagsTesting/WheelCard";

export default function TagDetailPage() {
  const { tagId } = useParams();
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tagId) {
      fetch(`/api/wheels-by-tag?tag=${encodeURIComponent(tagId)}`)
        .then((res) => res.json())
        .then((data) => {
          setWheels(data.wheels || []);
        })
        .catch((err) => console.error("Failed to fetch wheels", err))
        .finally(() => setLoading(false));
    }
  }, [tagId]);

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto dark:bg-gray-950 min-h-screen transition-colors">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white capitalize">
        {decodeURIComponent(tagId)} Wheels
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        ) : wheels.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
            No wheels found for “{tagId}”.
          </p>
        ) : (
          wheels.map((wheel) => (
            <div key={wheel._id} className="h-full">
              <WheelCard wheel={wheel} className="h-full" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
