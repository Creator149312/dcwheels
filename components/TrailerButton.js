"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";

export default function TrailerButton({ trailerKey, title, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!trailerKey) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold border border-border bg-muted/50 text-foreground hover:bg-muted active:scale-95 transition-colors duration-150 disabled:opacity-50 shadow-sm ${className}`}
      >
        <Play size={15} className="fill-current text-foreground" />
        Trailer
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black/95 border-none outline-none max-h-screen flex flex-col justify-center">
          <div className="hidden">
            <DialogTitle>Trailer - {title}</DialogTitle>
            <DialogDescription>Watch the official promo video/trailer for {title}</DialogDescription>
          </div>
          
          <div className="relative aspect-video w-full">
            {isOpen && (
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title={`Trailer - ${title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
