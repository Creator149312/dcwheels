import Link from "next/link";
import { ArrowRight, Link as LinkIcon } from "lucide-react";

/**
 * Renders a list of TopicPage links associated with a wheel.
 * Helps users navigate back to the "Source of Truth" pages (Movies, Anime, etc).
 */
export default function RelatedTopicLinks({ topics = [] }) {
  if (!topics || topics.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <LinkIcon size={14} className="text-primary" />
        <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          Associated Topics
        </h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, i) => (
          <Link
            key={i}
            href={`/${topic.type}/${topic.slug}`}
            className="group flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-muted/50 border border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all"
          >
            {topic.cover ? (
              <img 
                src={topic.cover} 
                alt={topic.title}
                className="w-8 h-8 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-[8px] font-bold text-muted-foreground">TP</span>
              </div>
            )}
            
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {topic.title}
              </span>
              <span className="text-[9px] uppercase font-bold text-muted-foreground/70 tracking-tight">
                {topic.type}
              </span>
            </div>
            
            <ArrowRight size={10} className="ml-1 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
