"use client";

import { useEffect, useState } from "react";
// import WheelCard from "./WheelCard";

function WheelCard({ wheel, compact = false }) {
  return (
    <div
      className={`border rounded p-3 ${
        compact ? "text-sm" : ""
      } bg-white dark:bg-gray-900`}
    >
      <h4 className="font-semibold mb-1 dark:text-white">{wheel.title}</h4>
      <p className="text-gray-500 dark:text-gray-400 truncate">
        {wheel.tags?.join(", ")}
      </p>
    </div>
  );
}

export default function SuggestedSidebar() {
  const [suggestedWheels, setSuggestedWheels] = useState([]);
  const tags = ["games"]
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   if (!tags || tags.length === 0) return;

  //   const fetchSuggestions = async () => {
  //     setLoading(true);
  //     try {
  //       const query = tags
  //         .map((tag) => `tags=${encodeURIComponent(tag)}`)
  //         .join("&");
  //       const res = await fetch(`/api/suggested-wheels?${query}`);
  //       const data = await res.json();
  //       setSuggestedWheels(data.wheels || []);
  //     } catch (err) {
  //       console.error("Failed to load suggested wheels", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchSuggestions();
  // }, []);

  return (<></>
    // <div className="w-full max-h-[600px] overflow-y-auto border-l dark:border-gray-800 p-4 bg-white dark:bg-gray-950">
    //   <h3 className="text-lg font-semibold mb-4 dark:text-white">
    //     Suggested Wheels
    //   </h3>

    //   {loading ? (
    //     <p className="text-sm text-gray-500 dark:text-gray-400">
    //       Loading suggestions...
    //     </p>
    //   ) : suggestedWheels.length === 0 ? (
    //     <p className="text-sm text-gray-500 dark:text-gray-400">
    //       No suggestions found.
    //     </p>
    //   ) : (
    //     <div className="space-y-4">
    //       {suggestedWheels.map((wheel) => (
    //         <WheelCard key={wheel._id} wheel={wheel} compact />
    //       ))}
    //     </div>
    //   )}
    // </div>
  );
}
