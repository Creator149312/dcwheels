"use client";

import { useState } from "react";

export default function ExpandableDescription({ description }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If description is short, just show it
  if (!description || description.length < 300) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed mt-4 mb-5">
        {description}
      </p>
    );
  }

  return (
    <div className="mt-4 mb-5">
      <p className={`text-sm text-muted-foreground leading-relaxed transition-all duration-300 ${!isExpanded ? "line-clamp-4" : ""}`}>
        {description}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-primary text-xs font-semibold mt-1 hover:underline focus:outline-none"
      >
        {isExpanded ? "Read Less" : "Read More"}
      </button>
    </div>
  );
}
