"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Activity as ActivityIcon } from "lucide-react";
import { DecisionTimelineItem } from "@components/DecisionTimeline";

/**
 * ActivityModal — the user's spin history viewer.
 * Lazily loaded from ProfileMenu and only fetched when first opened.
 */
export default function ActivityModal({ username, onClose }) {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/u/${encodeURIComponent(username)}/activity`)
      .then((r) => (r.ok ? r.json() : { stories: [] }))
      .then((d) => { if (!cancelled) setItems(d.stories || []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [username]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl overflow-hidden animate-scale-up flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 shrink-0">
          <h2 className="text-sm font-black text-foreground flex items-center gap-2">
            <ActivityIcon size={16} className="text-primary" />
            Activity
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : !items || items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              No decisions made yet. Spin a wheel to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <DecisionTimelineItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
