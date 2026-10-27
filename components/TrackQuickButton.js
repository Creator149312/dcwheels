"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { Check, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useEntityTracking } from "./EntityTrackingProvider";

// Lazy-load the heavy dialog and star modal only if and when an unrated user needs it
const QuickRateModal = dynamic(() => import("./QuickRateModal"), { ssr: false });

const LABELS = {
  movie: "Watched",
  tv: "Watched",
  anime: "Watched",
  game: "Played",
  character: "Favourite",
};

export default function TrackQuickButton({ type, entityId, name, slug, image, size = "default", className = "" }) {
  const { status: authStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const ctx = useEntityTracking();
  const statusData = ctx?.statusData;
  const setStatusData = ctx?.setStatusData;
  const userRating = ctx?.userRating;
  const setUserRating = ctx?.setUserRating;

  const [loading, setLoading] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const isDone = statusData?.status === "done";
  const isLoading = statusData === undefined && authStatus === "authenticated";
  const doneLabel = LABELS[type] || "Done";
  const isCompact = size === "sm" || size === "compact";

  const toggleStatus = async () => {
    if (authStatus === "unauthenticated") {
      openLoginPrompt("Log in to track your progress");
      return;
    }

    setLoading(true);
    try {
      if (isDone) {
        const res = await fetch(`/api/user-entity-status?entityId=${entityId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to unmark");
        setStatusData?.(null);
        toast.success(`Removed from ${doneLabel}`);
      } else {
        const res = await fetch("/api/user-entity-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: type,
            entityId,
            name,
            status: "done",
          }),
        });
        if (!res.ok) throw new Error("Failed to mark");
        const data = await res.json();
        setStatusData?.({ status: data.status });
        toast.success(`Marked as ${doneLabel}`);

        // If the user has not rated yet and this is a ratable content type, prompt with quick rating popup
        if (!userRating && type !== "character") {
          setShowRateModal(true);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(isDone ? "Failed to unmark" : "Failed to track item");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading && authStatus === "authenticated") {
    return (
      <div className={`${isCompact ? "h-8 w-28" : "h-[42px] w-36"} bg-muted/50 animate-pulse rounded-full border border-border`} />
    );
  }

  const sizeClasses = isCompact
    ? "px-3 py-1.5 text-xs gap-1.5"
    : "px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm gap-2";

  return (
    <>
      {isDone ? (
        <button
          onClick={toggleStatus}
          disabled={loading}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold border border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400 hover:bg-green-600/15 active:scale-95 transition-colors duration-150 disabled:opacity-50 shadow-sm ${sizeClasses} ${className}`}
        >
          {loading ? (
            <Loader2 size={isCompact ? 13 : 15} className="animate-spin" />
          ) : (
            <Check size={isCompact ? 13 : 15} strokeWidth={3} />
          )}
          {doneLabel}
          <X size={isCompact ? 12 : 13} className="ml-0.5 opacity-60" />
        </button>
      ) : (
        <button
          onClick={toggleStatus}
          disabled={loading}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold border border-border bg-muted/50 text-foreground hover:bg-muted active:scale-95 transition-colors duration-150 disabled:opacity-50 shadow-sm ${sizeClasses} ${className}`}
        >
          {loading ? (
            <Loader2 size={isCompact ? 13 : 15} className="animate-spin" />
          ) : (
            <Check size={isCompact ? 13 : 15} className="text-muted-foreground/70" />
          )}
          Mark as {doneLabel}
        </button>
      )}

      {/* Lazy-loaded Quick Rate Dialog (only renders in DOM once showRateModal becomes true) */}
      {showRateModal && (
        <QuickRateModal
          open={showRateModal}
          onOpenChange={setShowRateModal}
          name={name}
          doneLabel={doneLabel}
          topicPageId={entityId}
          onRated={(score) => setUserRating?.(score)}
        />
      )}
    </>
  );
}