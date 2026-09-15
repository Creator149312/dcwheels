import Link from "next/link";
import { ArrowRight, Link as LinkIcon } from "lucide-react";

/**
 * Renders a list of TopicPage links associated with a wheel.
 * Helps users navigate back to the "Source of Truth" pages (Movies, Anime, etc).
 */
export default function RelatedTopicLinks({ topics = [] }) {
  if (!topics || topics.length === 0) return null;

  return (
    <div className="mt-0.5">
      <div className="flex flex-wrap gap-1">
        {topics.map((topic, i) => (
          <Link
            key={i}
            href={`/${topic.type}/${topic.slug}`}
            className="group flex items-center gap-1.5 p-1 pr-1.5 rounded-md bg-background/50 border border-border/10 hover:bg-primary/5 hover:border-primary/20 transition-all"
          >
            {topic.cover ? (
              <img 
                src={topic.cover} 
                alt={topic.title}
                className="w-5 h-5 rounded-sm object-cover bg-muted"
              />
            ) : (
              <div className="w-5 h-5 rounded-sm bg-muted flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">TP</span>
              </div>
            )}
            
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors leading-none">
                {topic.title}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
