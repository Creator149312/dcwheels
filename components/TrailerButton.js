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
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-foreground bg-secondary/80 hover:bg-secondary border border-border/80 rounded-xl transition duration-200 shadow-sm active:scale-95 cursor-pointer ${className}`}
      >
        <Play size={14} className="fill-current text-foreground" />
        Watch Trailer
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
