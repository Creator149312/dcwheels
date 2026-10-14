"use client";

import { useState } from "react";
import { Check, Bookmark, List, X, Loader2, Plus } from "lucide-react";
import { useSavedEntities } from "@components/providers/SavedEntitiesProvider";
import toast from "react-hot-toast";

/**
 * ListPickerModal
 * ───────────────
 * Shared YouTube-style multi-list picker modal.
 * Used both by SavedEntitiesProvider (global un-save ambiguity / bookmark trigger)
 * and directly by AddToListButton.
 *
 * Supports toggle (save AND un-save per list) with optimistic updates and rollback.
 */
export default function ListPickerModal({ isOpen, onClose, entity }) {
  const savedEntities = useSavedEntities();
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [pendingListIds, setPendingListIds] = useState(new Set());

  if (!isOpen || !entity || !savedEntities) return null;

  const { entityId, entityType, name, slug, image } = entity;
  const lists = savedEntities.lists || [];
  const memberListIds = savedEntities.getMemberListIds(entityId);

  const handleToggleList = async (list) => {
    const listId = String(list.id);
    if (pendingListIds.has(listId)) return;

    const isMember = memberListIds.has(listId);
    setPendingListIds((prev) => new Set(prev).add(listId));

    if (isMember) {
      // ── UN-SAVE FROM THIS SPECIFIC LIST ─────────────────────────────
      const targetItem = (list.items || []).find((i) => String(i.entityId) === String(entityId));
      savedEntities.removeSaved(entityId, listId); // Optimistic removal

      try {
        if (targetItem?.itemId) {
          const res = await fetch(`/api/unifiedlist/${listId}/items/${targetItem.itemId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to remove item");
        }
        toast.success(`Removed from ${list.name}`);
      } catch (err) {
        console.error(err);
        if (targetItem) {
          savedEntities.addSaved(entityId, { listId, itemId: targetItem.itemId });
        }
        toast.error(`Failed to remove from ${list.name}`);
      } finally {
        setPendingListIds((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
      }
    } else {
      // ── SAVE TO THIS SPECIFIC LIST ──────────────────────────────────
      const payload = {
        type: "entity",
        entityType: entityType || "anime",
        entityId: String(entityId),
        name: name || "Untitled",
        slug: slug || String(entityId),
        image: image || "",
      };

      try {
        const res = await fetch(`/api/unifiedlist/${listId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to add item");
        const data = await res.json();
        const items = data?.list?.items || [];
        const newItem = items[items.length - 1];
        savedEntities.addSaved(entityId, { listId, itemId: newItem?._id || null });
        toast.success(`Saved to ${list.name}`);
      } catch (err) {
        console.error(err);
        toast.error(`Failed to save to ${list.name}`);
      } finally {
        setPendingListIds((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
      }
    }
  };

  const handleCreateListAndSave = async () => {
    if (!newListName.trim() || creating === "saving") return;
    setCreating("saving");

    try {
      const res = await fetch("/api/unifiedlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create list");
      const data = await res.json();
      const newList = data.list;

      const payload = {
        type: "entity",
        entityType: entityType || "anime",
        entityId: String(entityId),
        name: name || "Untitled",
        slug: slug || String(entityId),
        image: image || "",
      };

      const itemRes = await fetch(`/api/unifiedlist/${newList.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const itemData = await itemRes.json();
      const items = itemData?.list?.items || [];
      const newItem = items[items.length - 1];

      savedEntities.addList({
        id: newList.id,
        name: newList.name,
        isSystem: newList.isSystem,
        systemKey: newList.systemKey,
      });
      savedEntities.addSaved(entityId, { listId: newList.id, itemId: newItem?._id || null });

      toast.success(`Saved to ${newList.name}`);
      setNewListName("");
      setCreating(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create list");
      setCreating(false);
    }
  };

  const handleClose = () => {
    setCreating(false);
    setNewListName("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-card border border-border w-full max-w-sm rounded-[24px] shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-lg font-black text-foreground flex items-center gap-2">
            <List size={20} className="text-primary" />
            Save to List
          </h4>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Existing lists with checkboxes (YouTube-style toggle) */}
        <div className="space-y-1.5 mb-4 max-h-[300px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
          {!savedEntities.isLoaded || savedEntities.isFetching ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : lists.length === 0 ? (
            <div className="py-8 text-center bg-muted/30 rounded-2xl border border-dashed border-border mb-2">
              <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground font-medium px-4">
                No lists yet. Create your first collection below!
              </p>
            </div>
          ) : (
            lists.map((list) => {
              const listId = String(list.id);
              const isMember = memberListIds.has(listId);
              const isPending = pendingListIds.has(listId);

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => handleToggleList(list)}
                  disabled={isPending}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                    isMember
                      ? "border-primary/20 bg-primary/5 text-primary"
                      : "border-transparent hover:bg-muted/60 text-foreground"
                  } ${isPending ? "opacity-60" : ""}`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isMember
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      }`}
                    >
                      {isMember && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="truncate">{list.name}</span>
                  </span>
                  {isPending && <Loader2 size={16} className="animate-spin text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Create new list trigger */}
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary text-sm font-bold transition-all active:scale-[0.98]"
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateListAndSave();
              }}
              placeholder="Enter list name..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateListAndSave}
                disabled={creating === "saving"}
                className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center"
              >
                {creating === "saving" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Create & Save"
                )}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewListName("");
                }}
                className="px-4 py-3 rounded-xl bg-muted hover:bg-accent text-foreground text-sm font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
