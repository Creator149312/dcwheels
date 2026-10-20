"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { useEntityTracking } from "@components/EntityTrackingProvider";
import { useSavedEntities } from "@components/providers/SavedEntitiesProvider";
import ListPickerModal from "@components/ListPickerModal";
import { Check, Bookmark, ChevronDown } from "lucide-react";

/**
 * AddToListButton
 * ───────────────
 * IMDb-style save control.
 *
 * - Main click instantly saves to the default "Saved" list.
 * - Dropdown arrow opens the list picker for custom lists.
 * - After saving, the button shows "Saved" with a dropdown to add to more lists.
 */
export default function AddToListButton({ type, entityId, name, slug, image, className = "", rounded = "rounded-full", size = "default" }) {
  const [open, setOpen] = useState(false);
  const [savedPopup, setSavedPopup] = useState({ show: false, listName: "" });
  const ctx = useEntityTracking();
  const savedEntities = useSavedEntities();
  const [localSaved, setLocalSaved] = useState(null);

  const listData = savedEntities
    ? savedEntities.getSaved(entityId)
    : ctx?.listData ?? localSaved;

  const saveMembership = (ref) => {
    if (savedEntities) savedEntities.addSaved(entityId, ref);
    else {
      ctx?.setListData?.(ref);
      setLocalSaved(ref);
    }
  };
  const [quickSaving, setQuickSaving] = useState(false);
  const { status: authStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const isSaved = !!listData;

  // Auto-dismiss the success toast after 3 s
  useEffect(() => {
    if (!savedPopup.show) return;
    const t = setTimeout(() => setSavedPopup({ show: false, listName: "" }), 3000);
    return () => clearTimeout(t);
  }, [savedPopup.show]);

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
      saveMembership({ listId: data.listId, itemId: data.itemId });
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
      saveMembership({ listId, itemId: newItem?._id || null });
      setOpen(false);
      setSavedPopup({ show: true, listName: list?.name || "List" });
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setQuickSaving(false);
    }
  }

  function closeModal() {
    setOpen(false);
  }

  const isCompact = size === "sm" || size === "compact";

  return (
    <>
      {/* ── Split button: quick-save + list picker ────── */}
      <div className={`inline-flex overflow-hidden shadow-2xs border border-border/80 w-full ${rounded} ${className}`}>
        {/* Main quick-save action */}
        <button
          onClick={quickSaveToDefault}
          disabled={isSaved || quickSaving || authStatus === "loading"}
          className={`
            inline-flex items-center justify-center gap-1.5 transition-colors duration-150 flex-1 font-semibold
            ${isCompact ? "px-3 py-2 text-xs" : "px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm"}
            ${isSaved
              ? "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-r border-blue-600/20 cursor-default"
              : "bg-muted/40 text-foreground hover:bg-muted active:scale-[0.98]"
            }
          `}
        >
          {isSaved ? (
            <Check size={isCompact ? 14 : 16} strokeWidth={2.5} />
          ) : (
            <Bookmark size={isCompact ? 14 : 16} />
          )}
          <span>{isSaved ? "Saved" : quickSaving ? "Saving…" : "Save to List"}</span>
        </button>

        {/* Dropdown arrow to open custom list picker */}
        <button
          onClick={() => {
            if (authStatus === "loading") return;
            if (authStatus === "unauthenticated") {
              openLoginPrompt?.();
              return;
            }
            if (savedEntities?.openPicker) {
              savedEntities.openPicker({
                entityId,
                entityType: type,
                name,
                slug,
                image,
              });
            } else {
              setOpen(true);
            }
          }}
          aria-label="Choose list"
          className={`
            inline-flex items-center justify-center px-2 transition-colors duration-150
            ${isSaved
              ? "bg-blue-600/10 text-blue-700 dark:text-blue-400 hover:bg-blue-600/20"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-l border-border/80"
            }
          `}
        >
          <ChevronDown size={isCompact ? 14 : 16} />
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

      {/* ── Fallback modal for isolated contexts without SavedEntitiesProvider ── */}
      {open && (
        <ListPickerModal
          isOpen={open}
          onClose={closeModal}
          entity={{ entityId, entityType: type, name, slug, image }}
        />
      )}
    </>
  );
}
