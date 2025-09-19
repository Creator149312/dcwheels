"use client";
import { useState, useRef, useEffect } from "react";

export default function Description({ pageData, wordsList }) {
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current?.scrollHeight > 64) setNeedsToggle(true);
  }, [pageData]);

  return (
    <div className="text-lg bg-gray-100 dark:bg-gray-800/60 p-4 rounded-md mb-4">
      <div
        ref={ref}
        style={{
          maxHeight: expanded ? "none" : "64px",
          overflow: expanded ? "visible" : "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        {!pageData ? (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-line mb-4">
            {wordsList.description}
          </p>
        ) : (
          pageData.content.map((item, i) => {
            if (item.type === "paragraph")
              return (
                <p key={i} className="mb-4 text-gray-800 dark:text-gray-200">
                  {item.text}
                </p>
              );
            if (item.type === "image")
              return <img key={i} src={item.src} alt={item.alt} />;
            if (item.type === "link")
              return (
                <a
                  key={i}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {item.text}
                </a>
              );
            if (item.type === "heading") {
              const H = `h${item.level}`;
              return (
                <H key={i} className="text-gray-900 dark:text-gray-100">
                  {item.text}
                </H>
              );
            }
            return null;
          })
        )}
      </div>

      {needsToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
