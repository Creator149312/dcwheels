"use client";
import { useState } from "react";
import { createSegment } from "@utils/segmentUtils";
import { useSession } from "next-auth/react";
import useUnifiedLists from "@utils/customHooks/useUnifiedLists";

const ListSelector = ({ html, setSegData }) => {
  const [selectedListId, setSelectedListId] = useState(null);
  const { status } = useSession();

  // Using the custom hook to fetch lists lazily
  const { lists, loading, fetchLists } = useUnifiedLists();

  // Load the list directly on selection — no modal needed.
  const handleListChange = (e) => {
    const listId = e.target.value;
    setSelectedListId(listId);
    const selectedList = lists.find((list) => list.id === listId);
    if (!selectedList) return;
    prepareBasicWheel(selectedList);
  };

  const prepareBasicWheel = (data) => {
    if (!data) return;

    // Normalize all items into segments with id, type, payload
    const wordsText = data.items.map((item) => {
      if (item.type === "word") {
        return createSegment(item.word);
      }

      if (item.type === "entity") {
        return createSegment(item.name, {
          type: "entity",
          image: item.image || null,
          payload: {
            entityType: item.entityType || null,
            entityId: item.entityId || null,
            slug: item.slug || null,
          },
        });
      }

      // fallback for unknown types
      return createSegment("Unknown");
    });

    setSegData(wordsText);

    if (html && html.current !== undefined) {
      html.current = wordsText
        .map((seg) => `<div>${seg.text}</div>`)
        .join("");
    }
  };

  if (status !== "authenticated") return null;

  return (
    <div className="w-full">
      <select
        value={selectedListId || ""}
        onChange={handleListChange}
        onFocus={fetchLists}
        className="w-full h-10 sm:h-8 py-1.5 sm:py-1 px-3 sm:px-2.5 border border-border/60 rounded-xl sm:rounded-lg bg-muted/40 hover:bg-muted/60 text-sm sm:text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer transition-colors touch-manipulation"
      >
        <option value="" disabled>
          {loading ? "Loading lists..." : "Select a List to Load"}
        </option>
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ListSelector;
