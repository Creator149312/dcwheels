"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { Bookmark } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { useSavedEntities } from "@components/providers/SavedEntitiesProvider";
import { trackAffinity } from "@utils/affinity";

function QuickSaveButton({
  entityType,
  entityId,
  itemTitle = "",
  itemSlug = "",
  itemImage = "",
  variant = "icon",
  className = "",
  showText = false,
  lazyCheck = false, // legacy prop — global cache makes per-card fetching unnecessary
}) {
  const { data: session, status: sessionStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const savedEntities = useSavedEntities(); // null when provider is absent

  const [loading, setLoading] = useState(false);
  // Fallback state for contexts rendered outside SavedEntitiesProvider
  const [localRef, setLocalRef] = useState(null);

  // Source of truth: global cache when available, else local state
  const savedRef = savedEntities ? savedEntities.getSaved(entityId) : localRef;

  // Fallback path only: if mounted outside the provider (e.g. isolated modals),
  // do the legacy one-off lookup. When the provider exists this never fires.
  useEffect(() => {
    if (savedEntities) return;
    if (sessionStatus !== "authenticated" || !entityId) return;
    let ignore = false;
    fetch(`/api/unifiedlist/by-entity?entityId=${encodeURIComponent(entityId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!ignore && d?.found) setLocalRef({ listId: d.listId, itemId: d.itemId }); })
      .catch(() => {});
    return () => { ignore = true; };
  }, [savedEntities, sessionStatus, entityId]);

  const setSaved = useCallback(
    (ref, fromListId) => {
      if (savedEntities) {
        if (ref) savedEntities.addSaved(entityId, ref);
        else savedEntities.removeSaved(entityId, fromListId);
      } else {
        setLocalRef(ref);
      }
    },
    [savedEntities, entityId]
  );

  const handleToggle = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      openLoginPrompt?.();
      return;
    }
    if (loading) return;

    // Affinity capture: saving is the strongest fandom signal we have
    trackAffinity(entityType, "save");

    const prevRef = savedRef;
    const memberListIds = savedEntities ? savedEntities.getMemberListIds(entityId) : new Set();

    // ── YOUTUBE-STYLE AMBIGUITY RESOLUTION ─────────────────────────────
    // If this item is present in MULTIPLE lists (> 1), clicking un-save
    // would be ambiguous. Open the list picker modal so the user can choose
    // which list(s) to remove it from or keep it in.
    if (prevRef && memberListIds.size > 1 && savedEntities?.openPicker) {
      savedEntities.openPicker({
        entityId,
        entityType,
        name: itemTitle,
        slug: itemSlug,
        image: itemImage,
      });
      return;
    }

    setLoading(true);

    try {
      if (prevRef) {
        // ── UNSAVE (Single list membership) ────────────────────────────
        setSaved(null, prevRef.listId); // optimistic
        const res = await fetch(
          `/api/unifiedlist/${prevRef.listId}/items/${prevRef.itemId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error();
        toast.success("Removed from Library");
      } else {
        // ── SAVE ───────────────────────────────────────────────────────
        // The global cache already answers "is this saved?" — no duplicate
        // pre-check request needed. quick-track upserts server-side anyway.
        const res = await fetch("/api/unifiedlist/quick-track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType,
            entityId: String(entityId),
            name: itemTitle || "Untitled",
            slug: itemSlug || String(entityId),
            image: itemImage || "",
            status: "want",
          }),
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        setSaved({ listId: data.listId, itemId: data.itemId });
        toast.success("Saved to Library!");
      }
    } catch {
      setSaved(prevRef); // revert
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [session, openLoginPrompt, loading, savedRef, setSaved, entityType, entityId, itemTitle, itemSlug, itemImage]);

  const isSaved = !!savedRef;

  // Memoized icon — avoids re-creating the SVG node on unrelated re-renders
  const bookmarkIcon = (
    <Bookmark
      size={16}
      className={`h-4 w-4 ${isSaved ? "fill-current" : "fill-transparent"}`}
    />
  );

  if (variant === "button") {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors leading-none shadow-sm h-8 md:h-9 ${
          isSaved
            ? "border-primary/40 bg-primary/10 text-primary dark:border-primary/60 dark:bg-primary/20 dark:text-primary-foreground"
            : "border-border bg-muted text-foreground hover:bg-accent"
        } ${loading ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
        aria-label={isSaved ? "Remove from Library" : "Save to Library"}
      >
        <Bookmark size={15} className={isSaved ? "fill-current" : ""} />
        <span className={showText ? "inline" : "hidden md:inline"}>{isSaved ? "Saved" : "Save"}</span>
      </button>
    );
  }

  // Unified overlay (feed shelves + topic grids): slim bookmark, top-right,
  // no heavy circle. Saved state stays visible as a persistent library signal.
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`absolute top-1.5 right-1.5 z-10 p-1 rounded-md transition-all duration-300 ${
        isSaved
          ? "opacity-100 text-primary bg-black/25"
          : "opacity-100 md:opacity-0 group-hover:opacity-100 text-white bg-black/35 hover:bg-black/55"
      } ${loading ? "opacity-60" : ""} ${className}`}
      aria-label={isSaved ? "Remove from Library" : "Save to Library"}
    >
      {bookmarkIcon}
    </button>
  );
}

export default memo(QuickSaveButton);

