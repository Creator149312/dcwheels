"use client";

import { Disc3, Zap } from "lucide-react";

export default function RelatedWheels({ relatedWheels }) {
  return (
    <aside className="hidden lg:block w-full p-0">
      {/* Sleek Minimalist Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Zap className="text-blue-500" size={14} />
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Up Next
        </h4>
        <div className="flex-1 h-[1px] bg-border ml-2" />
      </div>

      {/* Compact List Container — height is driven by the parent aside
          (which stretches to match the wheel card via grid stretch). */}
      <div className="space-y-1.5 pr-1">
        {relatedWheels.map((wheel) => (
          <a
            key={wheel._id}
            href={`/uwheels/${wheel._id}`}
            className="group flex items-center gap-3 p-2 rounded-xl bg-transparent hover:bg-muted/60 border border-transparent hover:border-border transition-colors duration-150 active:scale-[0.98]"
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center group-hover:bg-primary transition-colors">
              <Disc3 className="w-5 h-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
            </div>

            {/* Title */}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-xs line-clamp-2 text-foreground group-hover:text-primary">
                {wheel.title}
              </span>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
}

