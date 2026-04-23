"use client";
import { useEffect, useState } from "react";

export default function RelatedContent({ currentTags }) {
  const [activeTab, setActiveTab] = useState("wheels"); // "wheels" or "pages"
  const [relatedWheels, setRelatedWheels] = useState([]);
  const [relatedPages, setRelatedPages] = useState([]);

  useEffect(() => {
    if (!currentTags || currentTags.length === 0) return;

    const fetchRelatedWheels = async () => {
      const res = await fetch(
        `/api/related-wheels/advanced?tags=${currentTags.join(",")}`
      );
      const data = await res.json();
      setRelatedWheels(data);
    };

    const fetchRelatedPages = async () => {
      const res = await fetch(
        `/api/related-pages?tags=${currentTags.join(",")}`
      );
      const data = await res.json();
      setRelatedPages(data);
    };

    fetchRelatedWheels();
    fetchRelatedPages();
  }, [currentTags]);

  const renderList = (items, type) => (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {items.map((item) => {
        // Different fields depending on type
        const thumbnail = type === "wheels" ? item.wheelPreview : item.cover;
        const title =
          type === "wheels"
            ? item.title
            : item.title?.default ||
              item.title?.english ||
              item.title?.romaji ||
              item.title?.localized ||
              item.title?.original ||
              item.title?.full; // both have .title, but kept explicit
        const href =
          type === "wheels"
            ? `/test/relatedWheels/${item._id}`
            : `/${item.type}/${item.slug}`; // topic pages use /type/slug

        return (
          <div
            key={item._id}
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition"
          >
            <a href={href} className="flex items-center space-x-3 w-full">
              {/* Thumbnail */}
              <div className="w-20 h-14 rounded-md flex-shrink-0 overflow-hidden bg-gray-300 dark:bg-gray-700">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>

              {/* Title + meta */}
              <div className="flex flex-col">
                <span className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                  {title}
                </span>
                {type === "pages" && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.tags?.length || 0} tags
                  </span>
                )}
              </div>
            </a>
          </div>
        );
      })}
    </div>
  );

  return (
    <aside className="w-full md:w-80 lg:w-96 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto min-h-[24rem] bg-white dark:bg-gray-900">
      {/* Tabs */}
      <div className="flex space-x-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("wheels")}
          className={`pb-2 text-sm font-semibold ${
            activeTab === "wheels"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Related Wheels
        </button>
        <button
          onClick={() => setActiveTab("pages")}
          className={`pb-2 text-sm font-semibold ${
            activeTab === "pages"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Related Pages
        </button>
      </div>

      {/* Content */}
      {activeTab === "wheels"
        ? renderList(relatedWheels, "wheels")
        : renderList(relatedPages, "pages")}
    </aside>
  );
}
