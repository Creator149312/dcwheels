"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

const STAR_LABELS = {
  1: { text: "Skip It", color: "text-red-500" },
  2: { text: "Not Recommended", color: "text-orange-500" },
  3: { text: "It's OK", color: "text-yellow-500" },
  4: { text: "Worth Your Time", color: "text-lime-500" },
  5: { text: "Must Watch", color: "text-emerald-500" },
};

export default function QuickRateModal({
  open,
  onOpenChange,
  name,
  doneLabel,
  topicPageId,
  onRated,
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleQuickRate = async (score) => {
    if (submittingRating) return;
    setSubmittingRating(true);
    try {
      onRated?.(score);
      const res = await fetch("/api/worthit/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicPageId, rating: score }),
      });
      if (res.ok) {
        toast.success(`Rated ${score}/5 stars!`);
        onOpenChange(false);
      } else {
        toast.error("Failed to submit rating");
      }
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-6 text-center">
        <DialogHeader className="space-y-2 text-center sm:text-center">
          <DialogTitle className="text-lg font-bold text-foreground">
            How was {name}?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            You marked this as {doneLabel.toLowerCase()}! Tap a star to drop your quick rating.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col items-center justify-center gap-3">
          <div className="h-5">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                STAR_LABELS[hoverRating]?.color || "text-muted-foreground"
              }`}
            >
              {hoverRating ? STAR_LABELS[hoverRating]?.text : "Select your rating"}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleQuickRate(star)}
                disabled={submittingRating}
                className="p-1 transition-transform duration-150 hover:scale-125 active:scale-95 cursor-pointer flex-shrink-0"
                aria-label={`Rate ${star} out of 5 stars`}
              >
                <Star
                  size={32}
                  className={`transition-all duration-200 ${
                    (hoverRating || 0) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30 hover:text-amber-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {submittingRating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Loader2 size={13} className="animate-spin" /> Submitting rating...
            </div>
          )}
        </div>

        <div className="flex justify-center border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition px-4 py-1.5 rounded-full hover:bg-muted"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
