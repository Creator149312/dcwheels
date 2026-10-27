"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

// Lazy-load the editor only when modal opens on mobile
const WheelEditorFull = dynamic(() => import("./WheelEditorFull"), {
  ssr: false,
});

export default function WheelEditorModal({ isOpen, onClose, mustSpin, currentPath }) {
  // Prevent body scrolling behind the modal when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:hidden">
      {/* Dimmed backdrop — reveals the top of the wheel behind the drawer; tapping dismisses */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200 cursor-pointer"
        aria-hidden="true"
      />

      {/* 88dvh Bottom Sheet Drawer container with rounded top corners & safe-area bottom inset */}
      <div className="relative z-10 w-full h-[88dvh] max-h-[88dvh] bg-background rounded-t-3xl border-t border-border/80 shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200 overflow-hidden">
        {/* Drag handle pill */}
        <div
          onClick={onClose}
          className="w-full pt-2.5 pb-1 flex justify-center shrink-0 bg-card cursor-pointer touch-manipulation"
        >
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header with clean Close button */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card shrink-0">
          <h2 className="font-bold text-base sm:text-lg text-foreground">Edit Wheel</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 hover:bg-muted active:scale-95 rounded-xl transition-colors text-muted-foreground hover:text-foreground touch-manipulation cursor-pointer"
            aria-label="Close editor"
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor content - strict height bounds for internal scrolling with iOS momentum */}
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <WheelEditorFull mustSpin={mustSpin} currentPath={currentPath} inModal={true} />
        </div>
      </div>
    </div>
  );
}
