"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

export default function FiltersBar({ genresList, onApply }) {
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState(2025);

  const applyFilters = () => {
    onApply({ genre, year });
    setOpen(false);
  };

  const resetFilters = () => {
    setGenre("");
    setYear(2025);
    onApply({ genre: "", year: "" });
    setOpen(false);
  };

  return (
    <>
      {/* ✅ Filter Icon */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 border border-border rounded-lg hover:bg-muted"
      >
        <SlidersHorizontal size={22} />
      </button>

      {/* ✅ Slide‑Over Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-72 bg-background h-full shadow-xl p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Filters</h2>

            {/* Genre Dropdown */}
            <label className="text-sm mb-1">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="border border-border px-3 py-2 rounded mb-6 bg-muted text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Genres</option>
              {genresList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Year Slider */}
            <label className="text-sm mb-1">Year: {year}</label>
            <input
              type="range"
              min="1980"
              max="2025"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full mb-8"
            />

            {/* Buttons */}
            <button
              onClick={applyFilters}
              className="bg-primary text-primary-foreground py-2 rounded hover:bg-primary/90 transition mb-3"
            >
              Apply Filters
            </button>

            <button
              onClick={resetFilters}
              className="border border-border py-2 rounded hover:bg-muted transition"
            >
              Reset
            </button>

            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="mt-auto text-sm text-muted-foreground hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
