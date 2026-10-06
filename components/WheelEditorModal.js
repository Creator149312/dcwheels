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
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Full-screen modal container with safe-area insets */}
      <div className="absolute inset-0 bg-background flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card shrink-0">
          <h2 className="font-bold text-base sm:text-lg">Edit Wheel</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary active:scale-95 rounded-lg transition-colors text-foreground touch-manipulation cursor-pointer"
            aria-label="Close editor"
          >
            <X size={22} />
          </button>
        </div>

        {/* Editor content - strict height bounds for internal scrolling with iOS momentum */}
        <div className="flex-1 min-h-0 flex flex-col p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <WheelEditorFull mustSpin={mustSpin} currentPath={currentPath} inModal={true} />
        </div>
      </div>
    </div>
  );
}
