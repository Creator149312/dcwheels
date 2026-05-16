"use client";
import { useContext, useState } from "react";
import { createSegment } from "@utils/segmentUtils";
import { SegmentsContext } from "@app/SegmentsContext";
import { useSession } from "next-auth/react";
import useUnifiedLists from "@utils/customHooks/useUnifiedLists";

const ListSelector = ({ html, setSegData }) => {
  const [selectedListId, setSelectedListId] = useState(null);
  const { setadvancedOptions } = useContext(SegmentsContext);
  const { status } = useSession();

  // Using the custom hook to fetch lists lazily
  const { lists, loading, error, fetchLists } = useUnifiedLists();

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
        // Entity metadata lives in `payload` only — top-level duplication
        // was dropped to halve storage on entity wheels.
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

  setadvancedOptions(false);
  setSegData(wordsText);

  html.current = wordsText
    .map((seg) => `<div>${seg.text}</div>`)
    .join("");
};

  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-2">
      {status === "authenticated" && (
        <div className="w-full">
          <select
            value={selectedListId || ""}
            onChange={handleListChange}
            onFocus={fetchLists}
            className="w-full py-1 px-3 border border-border rounded-lg bg-muted text-foreground"
          >
            <option value="" disabled>
              {loading ? "Loading lists..." : "Select a List to Load"}
            </option>
            {lists.map((list) => (
              // <option key={list._id} value={list._id}>
              <option key={list.id} value={list.id}>
                {/* {list.title} */}
                {list.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default ListSelector;
