"use client";
import { useState, useEffect } from "react";

export default function SaveButton({
  type,        // "entity" or "word"
  word,        // for word type
  wordData,    // for word type
  entityType,  // for entity type
  entityId,
  name,
  slug,
  image,
}) {
  const [lists, setLists] = useState([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [savedPopup, setSavedPopup] = useState({ show: false, listName: "" });

  // ✅ Auto-hide popup
  useEffect(() => {
    if (savedPopup.show) {
      const timer = setTimeout(() => {
        setSavedPopup({ show: false, listName: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [savedPopup.show]);

  // ✅ Fetch lists when modal opens
  useEffect(() => {
    if (open) {
      fetch("/api/unifiedlist")
        .then((res) => res.json())
        .then((data) => setLists(data.lists || []));
    }
  }, [open]);

  // ✅ Build item payload based on type
  function buildItemPayload() {
    if (type === "word") {
      return {
        type: "word",
        word,
        wordData,
      };
    }

    return {
      type: "entity",
      entityType,
      entityId,
      name,
      slug,
      image,
    };
  }

  // ✅ Save to existing list
  async function saveToList(listId) {
    const list = lists.find((l) => l.id === listId);

    await fetch(`/api/unifiedlist/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildItemPayload()),
    });

    setOpen(false);
    setSavedPopup({ show: true, listName: list?.name || "List" });
  }

  // ✅ Create new list + save item
  async function createListAndSave() {
    if (!newListName.trim()) return;

    // ✅ Create list
    const res = await fetch("/api/unifiedlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName }),
    });

    const data = await res.json();
    const newList = data.list;

    // ✅ Add item to new list
    await fetch(`/api/unifiedlist/${newList.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildItemPayload()),
    });

    setLists([...lists, newList]);
    setNewListName("");
    setCreating(false);
    setOpen(false);

    setSavedPopup({ show: true, listName: newList.name });
  }

  return (
    <div>
      {/* Save button */}
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-full 
             bg-blue-600 text-white shadow-lg hover:bg-blue-700 
             active:scale-95 transition dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* ✅ Success Popup */}
      {savedPopup.show && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in">
          <span>
            Saved to <strong>{savedPopup.listName}</strong>
          </span>
          <button
            onClick={() => setSavedPopup({ show: false, listName: "" })}
            className="text-white hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Popup Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 w-80 rounded-lg shadow-lg p-4">
            <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Save to…
            </h4>

            {/* Existing Lists */}
            {lists.length > 0 && !creating && (
              <ul className="space-y-2 mb-4">
                {lists.map((list) => (
                  <li key={list.id}>
                    <button
                      onClick={() => saveToList(list.id)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {list.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Create New List Button */}
            {!creating && (
              <button
                onClick={() => setCreating(true)}
                className="w-full px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                + Create new list
              </button>
            )}

            {/* Create New List Form */}
            {creating && (
              <div className="mt-3">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  className="w-full px-3 py-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setCreating(false)}
                    className="px-3 py-1 text-gray-600 dark:text-gray-300 hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createListAndSave}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-center text-gray-600 dark:text-gray-300 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
