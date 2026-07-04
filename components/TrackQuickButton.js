"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function TrackQuickButton({ type, entityId, name, slug, image, externalStatus = null }) {
  const { data: session, status: authStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();
  
  const [loading, setLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (externalStatus) {
      if (externalStatus === "done") setIsDone(true);
      setHasChecked(true);
    }
  }, [externalStatus]);

  let doneLabel = "Done";
  if (type === "game") doneLabel = "Played";
  if (type === "movie" || type === "tv" || type === "anime") doneLabel = "Watched";
  if (type === "character") doneLabel = "Favourite";

  // Check if it's already marked as done
  useEffect(() => {
    if (authStatus !== "authenticated" || !entityId || externalStatus) return;
    
    fetch(`/api/unifiedlist/by-entity?entityId=${entityId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.found && d.status === "done") {
          setIsDone(true);
        }
        setHasChecked(true);
      })
      .catch(() => setHasChecked(true));
  }, [authStatus, entityId]);

  const handleQuickTrack = async () => {
    if (authStatus === "unauthenticated") {
      openLoginPrompt("Log in to track your progress");
      return;
    }

    if (isDone) return; // Already tracked

    setLoading(true);
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
          status: "done"
        }),
      });

      if (!res.ok) throw new Error("Failed to track");

      setIsDone(true);
      toast.success(`Marked as ${doneLabel}!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to track item");
    } finally {
      setLoading(false);
    }
  };

  if (!hasChecked && authStatus === "authenticated") {
    return (
      <div className="h-[42px] w-36 bg-muted/50 animate-pulse rounded-full border border-border" />
    );
  }

  // Already marked as done — show a green confirmed badge (non-interactive)
  if (isDone) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400 cursor-default shadow-sm"
      >
        <Check size={15} strokeWidth={3} />
        {doneLabel}
      </button>
    );
  }

  return (
    <button
      onClick={handleQuickTrack}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-border bg-muted/50 text-foreground hover:bg-muted active:scale-95 transition-colors duration-150 disabled:opacity-50 shadow-sm"
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