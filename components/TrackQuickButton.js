"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { Check, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useEntityTracking } from "./EntityTrackingProvider";

const LABELS = {
  movie: "Watched",
  tv: "Watched",
  anime: "Watched",
  game: "Played",
  character: "Favourite",
};

export default function TrackQuickButton({ type, entityId, name, slug, image }) {
  const { status: authStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const ctx = useEntityTracking();
  const statusData = ctx?.statusData;
  const setStatusData = ctx?.setStatusData;

  const [loading, setLoading] = useState(false);

  const isDone = statusData?.status === "done";
  const isLoading = statusData === undefined && authStatus === "authenticated";
  const doneLabel = LABELS[type] || "Done";

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
      <div className="h-[42px] w-36 bg-muted/50 animate-pulse rounded-full border border-border" />
    );
  }

  if (isDone) {
    return (
      <button
        onClick={toggleStatus}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold border border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400 hover:bg-green-600/15 active:scale-95 transition-colors duration-150 disabled:opacity-50 shadow-sm"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Check size={15} strokeWidth={3} />
        )}
        {doneLabel}
        <X size={13} className="ml-0.5 opacity-60" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleStatus}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold border border-border bg-muted/50 text-foreground hover:bg-muted active:scale-95 transition-colors duration-150 disabled:opacity-50 shadow-sm"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Check size={15} className="text-muted-foreground/70" />
      )}
      Mark as {doneLabel}
    </button>
  );
}