"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import toast from "react-hot-toast";

const REASONS = [
  { value: "spam", label: "Spam / bot" },
  { value: "harassment", label: "Harassment" },
  { value: "nsfw", label: "NSFW / inappropriate" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

/**
 * ReportButton — small flag icon that opens an inline reason picker.
 * Submits to POST /api/report. Works for both posts and comments.
 *
 * Props:
 *   targetType  "post" | "comment"
 *   targetId    string — the MongoDB _id of the post or comment
 *   isLoggedIn  boolean — if false, click shows a toast prompt to log in
 */
export default function ReportButton({ targetType, targetId, isLoggedIn }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleOpen = () => {
    if (!isLoggedIn) {
      toast("Log in to report content");
      return;
    }
    setOpen((v) => !v);
  };

  const handleSubmit = async (reason) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      if (res.ok) {
        setDone(true);
        setOpen(false);
        toast.success("Report submitted. Thanks for keeping the community safe.");
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to submit report");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Flag size={11} /> Reported
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        title="Report this content"
        className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5 text-xs"
      >
        <Flag size={12} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setOpen(false)}
          />
          {/* Picker */}
          <div className="absolute right-0 top-5 z-[91] w-44 bg-popover border border-border rounded-xl shadow-xl overflow-hidden text-sm">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
              Report reason
            </div>
            {REASONS.map((r) => (
              <button
                key={r.value}
                disabled={submitting}
                onClick={() => handleSubmit(r.value)}
                className="w-full text-left px-3 py-2 hover:bg-accent text-foreground disabled:opacity-50 transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
