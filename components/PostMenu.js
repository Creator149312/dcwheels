"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Flag, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";

const REPORT_REASONS = [
  { value: "spam", label: "Spam / bot" },
  { value: "harassment", label: "Harassment" },
  { value: "nsfw", label: "NSFW / inappropriate" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

/**
 * PostMenu — the dropdown that appears when the user clicks ⋯ on a post.
 * Dynamically imported in PostCard so this entire chunk (icons + report
 * logic + REPORT_REASONS) is NOT downloaded until the first click.
 */
export default function PostMenu({ postId, isOwnPost, isLoggedIn, onHide, onClose, openLoginPrompt }) {
  const router = useRouter();
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleNotInterested = () => {
    onHide();
    onClose();
    toast("Post hidden", { icon: "👋" });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/post/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Post deleted");
        onHide();
        onClose();
      } else {
        toast.error(data.message || "Failed to delete post");
        setDeleteConfirm(false);
      }
    } catch {
      toast.error("Something went wrong");
      setDeleteConfirm(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleReport = async (reason) => {
    if (!isLoggedIn) {
      onClose();
      openLoginPrompt?.();
      return;
    }
    setReportSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "post", targetId: postId, reason }),
      });
      const data = await res.json();
      if (res.ok || res.status === 200) {
        setReportDone(true);
        setShowReportPicker(false);
        toast.success("Thanks for reporting. We'll review it.");
        setTimeout(onClose, 1200);
      } else {
        toast.error(data.message || "Failed to submit report");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="absolute right-0 top-9 z-[81] w-52 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden text-sm py-1">
      {!showReportPicker ? (
        <>
          {/* ── Own-post actions ── */}
          {isOwnPost && (
            <>
              <button
                onClick={() => {
                  router.push(`/post/create?postId=${postId}`);
                  onClose();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition"
              >
                <Pencil size={15} className="text-foreground" />
                <div>
                  <p className="font-medium text-foreground">Edit post</p>
                  <p className="text-xs text-muted-foreground">Modify content</p>
                </div>
              </button>

              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition disabled:opacity-50"
              >
                <Trash2 size={15} className="text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {deleteConfirm ? "Tap again to confirm" : "Delete post"}
                  </p>
                  <p className="text-xs text-muted-foreground">Permanently remove</p>
                </div>
              </button>
            </>
          )}

          {/* ── Other-user actions ── */}
          {!isOwnPost && (
            <>
              <button
                onClick={handleNotInterested}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition"
              >
                <EyeOff size={15} className="text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Not interested</p>
                  <p className="text-xs text-muted-foreground">Hide this post</p>
                </div>
              </button>

              <button
                onClick={() => setShowReportPicker(true)}
                disabled={reportDone}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition disabled:opacity-50"
              >
                <Flag size={15} className="text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {reportDone ? "Reported" : "Report post"}
                  </p>
                  <p className="text-xs text-muted-foreground">Flag for review</p>
                </div>
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
            Why are you reporting this?
          </div>
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              disabled={reportSubmitting}
              onClick={() => handleReport(r.value)}
              className="w-full text-left px-4 py-2.5 hover:bg-accent text-foreground transition disabled:opacity-50"
            >
              {r.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
