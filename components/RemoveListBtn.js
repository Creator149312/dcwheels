"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RemoveListBtn({ id, type }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const btnRef = useRef(null);

  // Auto-reset confirmation after 3 seconds
  useEffect(() => {
    if (confirmDelete) {
      const timer = setTimeout(() => setConfirmDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmDelete]);

  // Reset confirmation when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveList = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      const url = type === "unifiedlist" ? `/api/unifiedlist/${id}` : `/api/${type}?id=${id}`;
      const res = await fetch(url, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("List deleted");
        // Refresh the page after list is deleted to update UI
        location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete list");
        setConfirmDelete(false);
      }
    } catch (err) {
      toast.error("An error occurred");
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      ref={btnRef}
      onClick={handleRemoveList}
      disabled={isDeleting}
      className={`relative flex items-center justify-center p-2 rounded-xl transition-all border ${
        confirmDelete
          ? "bg-red-50 text-red-600 border-red-200 w-28"
          : "bg-background text-muted-foreground border-border hover:text-red-500 hover:border-red-200"
      }`}
      title={confirmDelete ? "Click again to confirm" : "Delete List"}
    >
      {isDeleting ? (
        <Loader2 size={18} className="animate-spin" />
      ) : confirmDelete ? (
        <span className="text-[10px] font-bold uppercase tracking-wider">Confirm?</span>
      ) : (
        <Trash2 size={18} />
      )}
    </button>
  );
}
