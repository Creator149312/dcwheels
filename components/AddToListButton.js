"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { useEntityTracking } from "@components/EntityTrackingProvider";
import { Plus, Check, Bookmark, List, X, Loader2, ChevronDown } from "lucide-react";

/**
 * AddToListButton
 * ───────────────
 * IMDb-style save control.
 *
 * - Main click instantly saves to the default "Saved" list.
 * - Dropdown arrow opens the list picker for custom lists.
 * - After saving, the button shows "Saved" with a dropdown to add to more lists.
 */
export default function AddToListButton({ type, entityId, name, slug, image }) {
  const [lists, setLists]                = useState([]);
  const [open, setOpen]                  = useState(false);
  const [creating, setCreating]          = useState(false);
  const [newListName, setNewListName]    = useState("");
  const [savedPopup, setSavedPopup]      = useState({ show: false, listName: "" });
  // Shared list-membership state from the topic page provider (optional).
  const ctx = useEntityTracking();
  const listData = ctx?.listData;
  const setListData = ctx?.setListData;
  const [isSavingToList, setIsSavingToList] = useState(null); // stores listId being saved to
  const [quickSaving, setQuickSaving]    = useState(false);
  const { status: authStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const isSaved = !!listData;

  // Auto-dismiss the success toast after 3 s
  useEffect(() => {
    if (!savedPopup.show) return;
    const t = setTimeout(() => setSavedPopup({ show: false, listName: "" }), 3000);
    return () => clearTimeout(t);
  }, [savedPopup.show]);
  useEffect(() => {
    // Fetch only once — if lists are already loaded from a previous open, skip.
    if (!open || authStatus !== "authenticated" || lists.length > 0) return;
    fetch("/api/unifiedlist?slim=1")
      .then((r) => r.json())
      .then((d) => setLists(d.lists || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authStatus]);

  // Payload shape expected by /api/unifiedlist/[id]/items
  const payload = {
    type: "entity",
    entityType: type,
    entityId,
    name,
    slug,
    image,
  };

  async function quickSaveToDefault() {
    if (authStatus === "unauthenticated") {
      openLoginPrompt?.();
      return;
    }
    if (quickSaving || isSaved) return;

    setQuickSaving(true);
    try {
      const res = await fetch("/api/unifiedlist/quick-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: type,
          entityId,
          name,
          slug,
          image,
          status: "want",
        }),
      });
      if (!res.ok) throw new Error("Quick save failed");
      const data = await res.json();
      setListData?.({ listId: data.listId, itemId: data.itemId });
      setSavedPopup({ show: true, listName: "Saved" });
    } catch (err) {
      console.error(err);
    } finally {
      setQuickSaving(false);
    }
  }

  async function saveToList(listId) {
    if (isSavingToList) return;
    const list = lists.find((l) => l.id === listId);
    setIsSavingToList(listId);
    try {
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
      setListData?.({ listId, itemId: newItem?._id || null });
      setOpen(false);
      setSavedPopup({ show: true, listName: list?.name || "List" });
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSavingToList(null);
    }
  }

  async function createListAndSave() {
    if (!newListName.trim() || creating === "saving") return;
    setCreating("saving");
    try {
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
      setListData?.({ listId: newList.id, itemId: newItemObj?._id || null });
      setLists((prev) => [...prev, newList]);
      setNewListName("");
      setCreating(false);
      setOpen(false);
      setSavedPopup({ show: true, listName: newList.name });
    } catch (err) {
      console.error("Create and save failed:", err);
    } finally {
      setCreating(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setCreating(false);
    setNewListName("");
  }

  return (
    <>
      {/* ── Split button: quick-save + list picker ────── */}
      <div className="inline-flex rounded-full overflow-hidden shadow-sm border border-border w-full">
        {/* Main quick-save action */}
        <button
          onClick={quickSaveToDefault}
          disabled={isSaved || quickSaving || authStatus === "loading"}
          className={`
            inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold
            transition-colors duration-150 flex-1
            ${isSaved
              ? "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-r border-blue-600/20 cursor-default"
              : "bg-muted/50 text-foreground hover:bg-muted active:scale-[0.98]"
            }
          `}
        >
          {isSaved ? (
            <Check size={16} strokeWidth={3} />
          ) : (
            <Bookmark size={16} />
          )}
          {isSaved ? "Saved" : quickSaving ? "Saving…" : "Save to List"}
        </button>

        {/* Dropdown arrow to open custom list picker */}
        <button
          onClick={() => {
            if (authStatus === "loading") return;
            if (authStatus === "unauthenticated") {
              openLoginPrompt?.();
              return;
            }
            setOpen(true);
          }}
          aria-label="Choose list"
          className={`
            inline-flex items-center justify-center px-2 transition-colors duration-150
            ${isSaved
              ? "bg-blue-600/10 text-blue-700 dark:text-blue-400 hover:bg-blue-600/20"
              : "bg-muted/50 text-foreground hover:bg-muted border-l border-border"
            }
          `}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* ── Success toast ───────────────────────────────────────────────── */}
      {savedPopup.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3
                        bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl
                        animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-sm">
            Added to <strong>{savedPopup.listName}</strong>
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
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-card border border-border w-full max-w-sm rounded-[24px] shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-black text-foreground flex items-center gap-2">
                <List size={20} className="text-primary" />
                Save to List
              </h4>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Existing lists */}
            <div className="space-y-1.5 mb-4 max-h-[300px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              {lists.length === 0 ? (
                <div className="py-8 text-center bg-muted/30 rounded-2xl border border-dashed border-border mb-2">
                   <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                   <p className="text-xs text-muted-foreground font-medium px-4">No lists yet. Create your first collection below!</p>
                </div>
              ) : (
                lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => saveToList(list.id)}
                    disabled={isSavingToList === list.id}
                    className="group w-full text-left px-4 py-3 rounded-xl
                               hover:bg-primary/5 hover:border-primary/20
                               border border-transparent
                               text-foreground text-sm font-semibold
                               transition-all flex items-center justify-between"
                  >
                    <span>{list.name}</span>
                    {isSavingToList === list.id ? (
                      <Loader2 size={16} className="animate-spin text-primary" />
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Save</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Create new list trigger */}
            {!creating && (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           bg-primary/5 hover:bg-primary/10 border border-primary/20
                           text-primary text-sm font-bold
                           transition-all active:scale-[0.98]"
              >
                <Plus size={18} />
                Create New List
              </button>
            )}

            {/* Inline create-list form */}
            {creating && (
              <div className="space-y-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createListAndSave(); }}
                  placeholder="Enter list name..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background
                             text-foreground text-sm font-medium
                             focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createListAndSave}
                    disabled={creating === "saving"}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90
                               text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20
                               transition-all active:scale-[0.98] flex items-center justify-center"
                  >
                    {creating === "saving" ? <Loader2 size={18} className="animate-spin" /> : "Create & Save"}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewListName(""); }}
                    className="px-4 py-3 rounded-xl bg-muted hover:bg-accent
                               text-foreground text-sm font-bold
                               transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
