"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MoreHorizontal, 
  Trash2, 
  Globe, 
  Lock,
  Loader2 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function WheelMenu({ wheelId, isPublic: initialIsPublic, authorHandle, onDeleted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [visibilitySubmitting, setVisibilitySubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  
  const { data: session } = useSession();
  const router = useRouter();
  const menuRef = useRef(null);

  const isOwnWheel = session?.user?.username === authorHandle || session?.user?.name === authorHandle;

  // Sync state if prop changes (e.g. from parent feed update)
  useEffect(() => {
    setIsPublic(initialIsPublic);
  }, [initialIsPublic]);

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

  const toggleVisibility = async () => {
    const newStatus = !isPublic;
    setVisibilitySubmitting(true);
    try {
      const resp = await fetch(`/api/wheel/${wheelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newStatus }),
      });
      if (resp.ok) {
        setIsPublic(newStatus);
        toast.success(newStatus ? "Wheel is now Public" : "Wheel is now Private");
        // router.refresh() is still good to keep server and client in sync globally
        router.refresh();
      } else {
        toast.error("Failed to update visibility");
      }
    } catch (e) {
      toast.error("Update failed");
    } finally {
      setVisibilitySubmitting(false);
      setIsOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
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
    } catch (e) {
      toast.error("Delete failed");
    } finally {
      setDeleteSubmitting(false);
      setDeleteConfirm(false);
    }
  };

  const handleReport = () => {
    toast.success("Reported. Thank you.");
    setReportDone(true);
    setTimeout(() => setIsOpen(false), 1000);
  };

  if (!isOwnWheel) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 rounded-xl border border-border bg-card shadow-lg z-[100] overflow-hidden py-1 animate-in fade-in zoom-in duration-100 origin-top-right">
          {/* Option 1: Change Visibility */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleVisibility();
            }}
            disabled={visibilitySubmitting}
            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition disabled:opacity-50"
          >
            {visibilitySubmitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : isPublic ? (
              <Lock size={15} className="text-foreground" />
            ) : (
              <Globe size={15} className="text-foreground" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {isPublic ? "Make private" : "Make public"}
              </p>
              <p className="text-xs text-muted-foreground">Change visibility</p>
            </div>
          </button>

          {/* Option 2: Delete */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleteSubmitting}
            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-accent transition disabled:opacity-50"
          >
            <Trash2 size={15} className="text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                {deleteConfirm ? "Tap again to confirm" : "Delete wheel"}
              </p>
              <p className="text-xs text-muted-foreground">Permanently remove</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
