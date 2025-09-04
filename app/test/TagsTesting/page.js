"use client";

import { useEffect, useState } from "react";
import WheelCard from "./WheelCard";

export default function TagsPage() {
  const [selectedTag, setSelectedTag] = useState("");
  const [tags, setTags] = useState([]);
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load top tags
  useEffect(() => {
    fetch("/api/tags-data")
      .then((res) => res.json())
      .then((data) => {
        setTags(data.tags || []);
      })
      .catch((err) => console.error("Failed to fetch tags", err));
  }, []);

  // Fetch wheels for selected tag
  const handleTagClick = async (tag) => {
    setSelectedTag(tag);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/wheels-by-tag?tag=${encodeURIComponent(tag)}`
      );
      const data = await res.json();
      setWheels(data.wheels || []);
    } catch (err) {
      console.error("Failed to fetch wheels for tag:", tag, err);
    } finally {
      setLoading(false);
    }
  };

  return (<></>
    // <div className="px-4 py-4 max-w-full mx-auto dark:bg-gray-950 min-h-screen transition-colors">
    //   {/* Tag Selector Scroll (YouTube style) */}
    //   <div className="-mx-4 px-4 overflow-x-scroll whitespace-nowrap mb-6 flex gap-3 no-scrollbar snap-x">
    //     {tags.map((tag) => (
    //       <button
    //         key={tag}
    //         className={`px-4 py-2 border rounded-full shrink-0 text-sm snap-start transition-colors ${
    //           selectedTag === tag
    //             ? "bg-black text-white dark:bg-white dark:text-black"
    //             : "bg-white text-black border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
    //         }`}
    //         onClick={() => handleTagClick(tag)}
    //       >
    //         {tag}
    //       </button>
    //     ))}
    //   </div>

    //   {/* Wheels Grid */}
    //   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
    //     {loading ? (
    //       <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
    //         Loading...
    //       </p>
    //     ) : selectedTag && wheels.length === 0 ? (
    //       <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
    //         No wheels found for “{selectedTag}”.
    //       </p>
    //     ) : (
    //       wheels.map((wheel) => (
    //         <div key={wheel._id} className="h-full">
    //           <WheelCard wheel={wheel} className="h-full" />
    //         </div>
    //       ))
    //     )}
    //   </div>
    // </div>
  );
}
