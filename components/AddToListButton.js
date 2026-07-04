"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";

function getListLabel() {
  return "Save to List";
}

// Binary status config: want → done → want
// Matches major platform patterns (Facebook, Instagram, Spotify)
const getStatusConfig = (itemType) => {
  let doneLabel = "Done";
  if (itemType === "game") doneLabel = "Played";
  if (itemType === "movie" || itemType === "tv" || itemType === "anime") doneLabel = "Watched";
  if (itemType === "character") doneLabel = "Favourite";

  return {
    want: {
      label: "Saved",
      icon: "🔖",
      next: "done",
      className: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
    },
    done: {
      label: doneLabel,
      icon: "✓",
      next: "want",
      className: "bg-green-600 hover:bg-green-700 text-white border-green-600",
    },
    // BACKWARD COMPAT: Accept legacy "in-progress", map to "done"
    "in-progress": {
      label: doneLabel,
      icon: "✓",
      next: "want",
      className: "bg-green-600 hover:bg-green-700 text-white border-green-600",
    },
  };
};

/**
 * AddToListButton
 * ───────────────
 * A hero-friendly CTA that saves any content page item to the user's
 * unified "Saved" collection. After saving, the button transforms into a status
 * selector (Want ↔ Done) without reopening any modal.
 *
 * Props
 *   type       – content type string ("movie" | "anime" | "game" | …)
 *   entityId   – MongoDB ObjectId string of the TopicPage document
 *   name       – display title (used as the list item label)
 *   slug       – page slug (used to build the link inside the list)
 *   image      – cover URL for the list item thumbnail
 */
export default function AddToListButton({ type, entityId, name, slug, image, initialSavedRef = null }) {
  const STATUS_CONFIG = getStatusConfig(type);
  const [lists, setLists]                = useState([]);
  const [open, setOpen]                  = useState(false);
  const [creating, setCreating]          = useState(false);
  const [newListName, setNewListName]    = useState("");
  const [savedPopup, setSavedPopup]      = useState({ show: false, listName: "" });
  // Once the user saves this item we store listId + itemId so status
  // updates can go straight to PATCH without re-fetching.
  const [savedRef, setSavedRef]          = useState(initialSavedRef); // { listId, itemId, status }
  const [statusUpdating, setStatusUpdating] = useState(false);
  const { status } = useSession();
  const openLoginPrompt = useLoginPrompt();

  // On mount, check if the authenticated user already has this entity saved.
  // Uses the new by-entity endpoint so we don't scan all lists client-side.
  useEffect(() => {
    if (initialSavedRef) {
      setSavedRef(initialSavedRef);
      return;
    }
    if (status !== "authenticated" || !entityId) return;
    fetch(`/api/unifiedlist/by-entity?entityId=${entityId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.found) {
          setSavedRef({ listId: d.listId, itemId: d.itemId, status: d.status || "want" });
        }
      })
      .catch(() => {}); // silent — degrades to "Add" button
  }, [status, entityId, initialSavedRef]);

  // Auto-dismiss the success toast after 3 s
  useEffect(() => {
    if (!savedPopup.show) return;
    const t = setTimeout(() => setSavedPopup({ show: false, listName: "" }), 3000);
    return () => clearTimeout(t);
  }, [savedPopup.show]);
  useEffect(() => {
    // Fetch only once — if lists are already loaded from a previous open, skip.
    if (!open || status !== "authenticated" || lists.length > 0) return;
    fetch("/api/unifiedlist?slim=1")
      .then((r) => r.json())
      .then((d) => setLists(d.lists || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const res = await fetch(`/api/unifiedlist/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    // The API returns the full updated items array. The new item is last
    // because the server used Array.push before saving.
    const items = data?.list?.items || [];
    const newItem = items[items.length - 1];
    setSavedRef({ listId, itemId: newItem?._id || null, status: "want" });
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
    const itemRes = await fetch(`/api/unifiedlist/${newList.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const itemData = await itemRes.json();
    const items = itemData?.list?.items || [];
    const newItemObj = items[items.length - 1];
    setSavedRef({ listId: newList.id, itemId: newItemObj?._id || null, status: "want" });
    setLists((prev) => [...prev, newList]);
    setNewListName("");
    setCreating(false);
    setOpen(false);
    setSavedPopup({ show: true, listName: newList.name });
  }

  // Cycle status: want ↔ done (binary system)
  async function cycleStatus() {
    if (!savedRef?.itemId || statusUpdating) return;
    const current = savedRef.status || "want";
    const next = STATUS_CONFIG[current]?.next || "want";
    setStatusUpdating(true);
    setSavedRef((prev) => ({ ...prev, status: next })); // optimistic
    try {
      await fetch(`/api/unifiedlist/${savedRef.listId}/items/${savedRef.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } catch {
      setSavedRef((prev) => ({ ...prev, status: current })); // rollback
    } finally {
      setStatusUpdating(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setCreating(false);
    setNewListName("");
  }

  const label = getListLabel();

  return (
    <>
      {/* ── CTA: status cycle button (already saved) or add button ────── */}
      {savedRef ? (
        /* ── Status cycle button ─────────────────────────────────────── */
        <button
          onClick={cycleStatus}
          disabled={statusUpdating}
          title="Click to change your status"
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2
                     px-5 py-2.5 rounded-full text-sm font-semibold
                     border shadow-sm active:scale-95 transition-colors duration-150
                     disabled:opacity-60 disabled:cursor-not-allowed
                     ${STATUS_CONFIG[savedRef.status]?.className || STATUS_CONFIG.want.className}`}
        >
          <span aria-hidden="true">{STATUS_CONFIG[savedRef.status]?.icon || "✓"}</span>
          {STATUS_CONFIG[savedRef.status]?.label || "On List"}
        </button>
      ) : (
        /* ── Add-to-list button ──────────────────────────────────────── */
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
                     bg-primary hover:bg-primary/90 active:scale-95
                     text-primary-foreground text-sm font-semibold
                     transition-colors duration-150"
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
      )}

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
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-lg p-5">
            <h4 className="text-base font-semibold mb-4 text-foreground">
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
                                 hover:bg-muted
                                 text-foreground text-sm
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
                           bg-muted hover:bg-accent
                           text-foreground text-sm
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
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background
                             text-foreground text-sm
                             outline-none focus:border-primary transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createListAndSave}
                    className="flex-1 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90
                               text-primary-foreground text-sm font-medium transition-colors"
                  >
                    Create &amp; Save
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewListName(""); }}
                    className="px-3 py-2 rounded-lg bg-muted hover:bg-accent
                               text-foreground text-sm
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
                         text-muted-foreground hover:text-foreground
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
