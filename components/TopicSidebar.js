import { memo } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, ChevronRight } from "lucide-react";

/**
 * TopicPage Sidebar Discovery.
 * Used to fill the space where RelatedWheels used to be.
 */
function TopicSidebar({ topics = [], isTrending = false }) {
  if (!topics || topics.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="px-3 py-3 border-b border-border/10 flex items-center gap-2">
        {isTrending ? (
          <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        )}
        <h2 className="text-[11px] font-black uppercase tracking-widest text-foreground/60">
          {isTrending ? "Trending Now" : "Related Topics"}
        </h2>
      </div>

      <div className="flex-1 p-1.5 space-y-1">
        {topics.map((topic, i) => (
          <Link
            key={i}
            href={`/${topic.type}/${topic.slug}`}
            className="group flex items-center gap-3 p-1.5 rounded-xl border border-transparent hover:bg-white/[0.03] transition-all duration-200 active:scale-[0.98]"
          >
            {/* Topic Image/Thumbnail - Sleek Compact */}
            <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-white/5 shadow-sm">
              {topic.cover ? (
                <img 
                  src={topic.cover} 
                  alt={topic.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                  <span className="text-[8px] font-black text-primary/20 uppercase">Topic</span>
                </div>
              )}
            </div>

            {/* Content - Ultra Sleek */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[13px] font-bold text-foreground/90 group-hover:text-primary transition-colors leading-tight truncate tracking-tight">
                {topic.title}
              </span>
              <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.1em] mt-0.5">
                {topic.type}
              </span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/10 group-hover:text-primary/40 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      <div className="p-3 bg-muted/10 border-t border-border/10">
        <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest text-center">
            {isTrending ? "Popular Hubs" : "Explore More"}
        </p>
      </div>
    </div>
  );
}

export default memo(TopicSidebar);
