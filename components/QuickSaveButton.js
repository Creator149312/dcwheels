"use client";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";

export default function QuickSaveButton({
  entityType,
  entityId,
  itemTitle = "",
  itemSlug = "",
  itemImage = "",
  variant = "icon",
  className = "",
  showText = false,
}) {
  const { data: session, status: sessionStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();

  // { listId, itemId } when saved, null when not
  const [savedRef, setSavedRef] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check initial saved state once the session is resolved
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !entityId) return;
    let ignore = false;
    fetch(`/api/unifiedlist/by-entity?entityId=${encodeURIComponent(entityId)}`)
      .then((r) => r.json())
      .then((d) => { if (!ignore && d.found) setSavedRef({ listId: d.listId, itemId: d.itemId }); })
      .catch(() => {});
    return () => { ignore = true; };
  }, [sessionStatus, entityId]);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      openLoginPrompt?.();
      return;
    }
    if (loading) return;

    const prevRef = savedRef;
    setLoading(true);

    try {
      if (prevRef) {
        // ── UNSAVE ─────────────────────────────────────────────────────
        setSavedRef(null); // optimistic
        const res = await fetch(
          `/api/unifiedlist/${prevRef.listId}/items/${prevRef.itemId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error();
        toast.success("Removed from Favorites");
      } else {
        // ── SAVE ───────────────────────────────────────────────────────
        // 1. Find or create "Favorites" list
        const listsRes = await fetch("/api/unifiedlist?slim=1");
        const { lists = [] } = await listsRes.json();
        let fav = lists.find((l) => l.name === "Favorites");

        if (!fav) {
          const createRes = await fetch("/api/unifiedlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Favorites", description: "My quick saves" }),
          });
          const { list } = await createRes.json();
          fav = { id: list.id };
        }

        // 2. Add item to Favorites
        const addRes = await fetch(`/api/unifiedlist/${fav.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "entity",
            entityType,
            entityId: String(entityId),
            name: itemTitle || "Untitled",
            slug: itemSlug || String(entityId),
            image: itemImage || "",
          }),
        });
        if (!addRes.ok) throw new Error();
        const { list: updatedList } = await addRes.json();
        const items = updatedList?.items || [];
        const newItem = items[items.length - 1];
        setSavedRef({ listId: fav.id, itemId: newItem?._id }); // optimistic confirm
        toast.success("Saved to Favorites!");
      }
    } catch {
      setSavedRef(prevRef); // revert
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isSaved = !!savedRef;

  if (variant === "button") {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
          isSaved
            ? "border-pink-400 bg-pink-50 text-pink-600 dark:border-pink-600 dark:bg-pink-900/30 dark:text-pink-300"
            : "border-border bg-muted text-foreground hover:bg-accent"
        } ${loading ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
        aria-label={isSaved ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Heart size={15} className={isSaved ? "fill-pink-600 dark:fill-pink-300" : ""} />
        {(showText || isSaved) && <span>{isSaved ? "Saved" : "Save"}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md border border-white/20 transition-all duration-300 z-10 shadow-sm ${
        isSaved
          ? "bg-pink-500 text-white"
          : "bg-black/40 text-white hover:bg-black/60 opacity-100 md:opacity-0 group-hover:opacity-100"
      } ${loading ? "opacity-60" : ""} ${className}`}
      aria-label={isSaved ? "Remove from Favorites" : "Add to Favorites"}
    >
      <Heart size={18} className={isSaved ? "fill-current" : "fill-transparent"} />
    </button>
  );
}

