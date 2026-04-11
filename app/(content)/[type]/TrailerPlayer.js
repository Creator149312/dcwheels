"use client";

import { useState } from "react";

/**
 * TrailerPlayer — lazy YouTube embed.
 *
 * Renders a thumbnail (maxresdefault from YouTube) with a play button overlay.
 * The actual <iframe> is only injected into the DOM when the user clicks play,
 * avoiding the ~300 KB YouTube embed script from blocking initial page load.
 *
 * Props:
 *   trailerKey  — YouTube video ID (e.g. "dQw4w9WgXcQ")
 *   title       — accessible label for the iframe / image alt
 */
export default function TrailerPlayer({ trailerKey, title }) {
  const [playing, setPlaying] = useState(false);

  const thumbnail = `https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg`;

  if (playing) {
    return (
      <div className="aspect-video max-w-2xl rounded-2xl overflow-hidden shadow-xl">
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video max-w-2xl rounded-2xl overflow-hidden shadow-xl relative group cursor-pointer">
      {/* Thumbnail */}
      <img
        src={thumbnail}
        alt={`${title} trailer thumbnail`}
        className="w-full h-full object-cover"
      />

      {/* Dark overlay on hover */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />

      {/* Play button */}
      <button
        onClick={() => setPlaying(true)}
        aria-label={`Play trailer for ${title}`}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all flex items-center justify-center shadow-xl">
          {/* Triangle play icon */}
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 text-gray-900 ml-1"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </button>
    </div>
  );
}
