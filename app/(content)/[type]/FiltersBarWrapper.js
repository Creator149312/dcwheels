"use client";

import { useRouter, useSearchParams } from "next/navigation";
import FiltersBar from "./FiltersBar";
import { useState } from "react";

export default function FiltersBarWrapper({ genresList }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");

  const applyFilters = ({ genre, year }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (genre) params.set("genre", genre);
    else params.delete("genre");

    if (year) params.set("year", year);
    else params.delete("year");

    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  const applySearch = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (search) params.set("search", search);
    else params.delete("search");

    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch();
    }
  };

  return (
    <div className="flex items-center gap-3">

      {/* ✅ Search Input */}
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700 w-full md:w-64"
      />

      {/* ✅ Search Button */}
      <button
        onClick={applySearch}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Search
      </button>

      {/* ✅ Filter Icon + Slide-over */}
      <FiltersBar genresList={genresList} onApply={applyFilters} />
    </div>
  );
}
