"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export default function HistoryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history/list")
      .then((r) => r.json())
      .then((d) => setItems(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No wheel visits yet. Go spin something!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <a
          key={item._id}
          href={`/uwheels/${item._id}`}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.title}
          </span>
          <ArrowRight size={14} className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </a>
      ))}
    </div>
  );
}
