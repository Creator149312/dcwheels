"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MoreHorizontal, 
  Trash2, 
  Share2, 
  Loader2 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getWheelUrl } from "@utils/UrlHandler";

export default function WheelMenu({ wheel, wheelId, authorHandle, userId, onDeleted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  
  const { data: session } = useSession();
  const router = useRouter();
  const menuRef = useRef(null);

  // Ownership check: exact userId match, or handle match
  const sessionUserId = session?.user?.id ? String(session.user.id) : null;
  const wheelUserId = userId ? String(userId) : null;
  const isOwnWheel =
    (sessionUserId && wheelUserId && sessionUserId === wheelUserId) ||
    (!wheelUserId && session?.user?.username === authorHandle) ||
    (!wheelUserId && session?.user?.name === authorHandle);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setDeleteConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const wheelPath = wheel ? getWheelUrl(wheel) : `/wheels/${wheelId}`;
    const fullUrl = typeof window !== "undefined"
      ? `${window.location.origin}${wheelPath}`
      : wheelPath;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl);
      toast.success("Wheel link copied!");
    } else {
      toast.error("Unable to copy link");
    }
    setIsOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setDeleteSubmitting(true);
    try {
      const resp = await fetch(`/api/wheel?id=${wheelId}`, { method: "DELETE" });
      if (resp.ok) {
        toast.success("Wheel removed");
        if (onDeleted) {
          onDeleted(wheelId);
        } else {
          window.dispatchEvent(new CustomEvent("feed:item-deleted", { detail: { id: wheelId, type: 'wheel' } }));
        }
        setIsOpen(false);
      } else {
        toast.error("Failed to delete wheel");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteSubmitting(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
          setDeleteConfirm(false);
        }}
        aria-label="Wheel actions"
        className="p-1.5 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-lg z-[100] overflow-hidden py-1 animate-in fade-in zoom-in duration-100 origin-top-right">
          {/* Share Wheel */}
          <button
            onClick={handleCopyLink}
            className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-muted text-xs font-semibold text-foreground transition"
          >
            <Share2 size={14} className="text-muted-foreground" />
            <span>Share Wheel</span>
          </button>

          {/* Delete Wheel (Owner only) */}
          {isOwnWheel && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleteSubmitting}
                className={`w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 transition text-xs font-semibold ${
                  deleteConfirm
                    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 font-bold"
                    : "text-red-600 dark:text-red-400 hover:bg-muted"
                } disabled:opacity-50`}
              >
                {deleteSubmitting ? (
                  <Loader2 size={14} className="animate-spin text-red-500" />
                ) : (
                  <Trash2 size={14} className="text-red-500" />
                )}
                <span>{deleteConfirm ? "Click to confirm delete" : "Delete Wheel"}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
