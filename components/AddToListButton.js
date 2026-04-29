"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";

// Maps the content type to a contextual CTA label so users see wording
// that matches their mental model: you "watch" movies/anime, "play" games.
const WATCHLIST_TYPES = new Set(["movie", "anime", "character", "series", "show", "tv"]);
const PLAYLIST_TYPES  = new Set(["game", "song", "music", "track", "album"]);

function getListLabel(type) {
  const t = (type || "").toLowerCase();
  if (WATCHLIST_TYPES.has(t)) return "Add to Watchlist";
  if (PLAYLIST_TYPES.has(t))  return "Add to Playlist";
  return "Save to List";
}

/**
 * AddToListButton
 * ───────────────
 * A hero-friendly CTA that saves any content page item to the user's
 * unified lists. Shares the same /api/unifiedlist API as SaveButton but
 * uses a full-text button styled for the dark cinematic backdrop.
 *
 * Props
 *   type       – content type string ("movie" | "anime" | "game" | …)
 *   entityId   – MongoDB ObjectId string of the TopicPage document
 *   name       – display title (used as the list item label)
 *   slug       – page slug (used to build the link inside the list)
 *   image      – cover URL for the list item thumbnail
 */
export default function AddToListButton({ type, entityId, name, slug, image }) {
  const [lists, setLists]                = useState([]);
  const [open, setOpen]                  = useState(false);
  const [creating, setCreating]          = useState(false);
  const [newListName, setNewListName]    = useState("");
  const [savedPopup, setSavedPopup]      = useState({ show: false, listName: "" });
  const { status } = useSession();
  const openLoginPrompt = useLoginPrompt();

  // Auto-dismiss the success toast after 3 s
  useEffect(() => {
    if (!savedPopup.show) return;
    const t = setTimeout(() => setSavedPopup({ show: false, listName: "" }), 3000);
    return () => clearTimeout(t);
  }, [savedPopup.show]);

  // Fetch the user's lists when the modal first opens. Guard on auth so
  // unauthenticated users never hit /api/unifiedlist and get a 401 —
  // the modal won't open for them in the first place (see button onClick).
  useEffect(() => {
    if (!open || status !== "authenticated") return;
    fetch("/api/unifiedlist")
      .then((r) => r.json())
      .then((d) => setLists(d.lists || []));
  }, [open, status]);

  // Payload shape expected by /api/unifiedlist/[id]/items
  const payload = {
    type: "entity",
    entityType: type,
    entityId,
    name,
    slug,
    image,
  };

  async function saveToList(listId) {
    const list = lists.find((l) => l.id === listId);
    await fetch(`/api/unifiedlist/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    setSavedPopup({ show: true, listName: list?.name || "List" });
  }

  async function createListAndSave() {
    if (!newListName.trim()) return;
    const res = await fetch("/api/unifiedlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName }),
    });
    const data = await res.json();
    const newList = data.list;
    await fetch(`/api/unifiedlist/${newList.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLists((prev) => [...prev, newList]);
    setNewListName("");
    setCreating(false);
    setOpen(false);
    setSavedPopup({ show: true, listName: newList.name });
  }

  function closeModal() {
    setOpen(false);
    setCreating(false);
    setNewListName("");
  }

  const label = getListLabel(type);

  return (
    <>
      {/* ── CTA trigger button ──────────────────────────────────────────
           Frosted-glass style so it reads well on the dark hero backdrop. */}
      <button
        onClick={() => {
          if (status !== "authenticated") {
            openLoginPrompt?.();
            return;
          }
          setOpen(true);
        }}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                   px-5 py-2.5 rounded-full
                   bg-blue-600 hover:bg-blue-700 active:scale-95
                   text-white text-sm font-semibold
                   shadow-sm transition-all duration-150"
      >
        {/* bookmark-plus icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 flex-shrink-0"
          aria-hidden="true"
        >
          <path d="M4 3a2 2 0 0 0-2 2v12.382a.5.5 0 0 0 .776.416L10 13.168l7.224 4.63A.5.5 0 0 0 18 17.382V5a2 2 0 0 0-2-2H4Z" />
          <path d="M10 7a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1V8a1 1 0 0 1 1-1Z" />
        </svg>
        {label}
      </button>

      {/* ── Success toast ───────────────────────────────────────────────── */}
      {savedPopup.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3
                        bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl
                        animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-sm">
            Saved to <strong>{savedPopup.listName}</strong>
          </span>
          <button
            onClick={() => setSavedPopup({ show: false, listName: "" })}
            className="text-white/60 hover:text-white text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── List picker modal ───────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl p-5">
            <h4 className="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {label}
            </h4>

            {/* Existing lists */}
            {lists.length > 0 && !creating && (
              <ul className="space-y-1 mb-3 max-h-56 overflow-y-auto">
                {lists.map((list) => (
                  <li key={list.id}>
                    <button
                      onClick={() => saveToList(list.id)}
                      className="w-full text-left px-3 py-2 rounded-lg
                                 hover:bg-gray-100 dark:hover:bg-gray-800
                                 text-gray-900 dark:text-gray-100 text-sm
                                 transition-colors"
                    >
                      {list.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Create new list trigger */}
            {!creating && (
              <button
                onClick={() => setCreating(true)}
                className="w-full px-3 py-2.5 rounded-lg
                           bg-gray-100 hover:bg-gray-200
                           dark:bg-gray-800 dark:hover:bg-gray-700
                           text-gray-900 dark:text-gray-100 text-sm
                           transition-colors"
              >
                + Create new list
              </button>
            )}

            {/* Inline create-list form */}
            {creating && (
              <div className="space-y-2 mt-1">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createListAndSave(); }}
                  placeholder="List name…"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-gray-200
                             dark:border-gray-700 bg-white dark:bg-gray-800
                             text-gray-900 dark:text-gray-100 text-sm
                             outline-none focus:border-blue-500 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createListAndSave}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700
                               text-white text-sm font-medium transition-colors"
                  >
                    Create &amp; Save
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewListName(""); }}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200
                               dark:bg-gray-800 dark:hover:bg-gray-700
                               text-gray-900 dark:text-gray-100 text-sm
                               transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Modal close */}
            <button
              onClick={closeModal}
              className="w-full mt-3 px-3 py-2 rounded-lg text-sm
                         text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                         transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
