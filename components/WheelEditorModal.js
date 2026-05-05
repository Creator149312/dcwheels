"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";

// Lazy-load the editor only when modal opens on mobile
const WheelEditorFull = dynamic(() => import("./WheelEditorFull"), {
  ssr: false,
});

export default function WheelEditorModal({ isOpen, onClose, mustSpin, currentPath }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Full-screen modal container */}
      <div className="absolute inset-0 bg-background flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <h2 className="font-bold text-lg">Edit Wheel</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Close editor"
          >
            <X size={24} />
          </button>
        </div>

        {/* Editor content - strict height bounds for internal scrolling */}
        <div className="flex-1 min-h-0 flex flex-col p-2">
          <WheelEditorFull mustSpin={mustSpin} currentPath={currentPath} inModal={true} />
        </div>
      </div>
    </div>
  );
}
