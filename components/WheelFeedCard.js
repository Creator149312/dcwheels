"use client";

import { memo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { timeAgo } from "@utils/HelperFunctions";
import { Play } from "lucide-react";
import WheelMenu from "./WheelMenu";
import { getWheelUrl } from "@utils/UrlHandler";

/**
 * WheelFeedCard — renders a full-width social feed card for a wheel.
 * Mimics the look of PostCard to sit interchangeably in the same stream.
 */
function WheelFeedCard({ wheel }) {
  const { data: session } = useSession();
  const [isHidden, setIsHidden] = useState(false);
  const [imgSrc, setImgSrc] = useState(() => {
    const full = wheel.wheelPreview || null;
    if (!full) return null;
    return full.endsWith(".webp") ? full.replace(".webp", "-thumb.webp") : full;
  });
  
  // UNIFIED ROUTING: Prefer slug (official/indexed) -> fallback to ID (user/fresh).
  const wheelUrl = getWheelUrl(wheel);
  
  // Sanitize display name (hide email)
  const authorNameRaw = wheel.authorName || "Community";
  const authorHandle = wheel.authorHandle || authorNameRaw;
  const authorName = authorHandle === authorNameRaw && authorNameRaw.includes("@") 
    ? authorNameRaw.split("@")[0] 
    : authorNameRaw;

  const isOwner = session?.user?.username === authorHandle || session?.user?.name === authorNameRaw;

  const firstLetter = authorName.charAt(0).toUpperCase();

  // If the card is hidden (e.g. deleted by owner), don't render it at all.
  // We don't show an "Undo" button here because deletion requires multiple
  // confirmations and also triggers asset cleanup in the background.
  if (isHidden) return null;

  return (
    <div className="border-b border-border/40 bg-card/60 dark:bg-muted/20 sm:shadow-2xs py-3 sm:border sm:border-border/60 sm:rounded-2xl sm:px-5 sm:py-4 sm:mb-0">
      {/* Header: Author + Time + Menu */}
      <div className="flex items-center justify-between gap-2 mb-2 px-4 sm:px-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {firstLetter}
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <Link
                href={`/u/${encodeURIComponent(authorHandle.toLowerCase())}`}
                className="font-bold text-foreground hover:underline truncate"
                title={authorName}
              >
                {authorName}
              </Link>
              <span className="text-xs text-muted-foreground/40">•</span>
              <span className="text-xs font-semibold text-muted-foreground/60 whitespace-nowrap">
                {timeAgo(wheel.createdAt)}
              </span>
              {isOwner && !wheel.isPublic && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                  Private
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <WheelMenu
          wheel={wheel}
          wheelId={wheel._id || wheel.id}
          isPublic={wheel.isPublic}
          authorHandle={authorHandle}
          userId={wheel.userId || null}
          onDeleted={() => setIsHidden(true)}
        />
      </div>

      {/* Wheel Title & Description */}
      <div className="mb-2.5 px-4 sm:px-0">
        <Link href={wheelUrl} className="block">
          <h2 className="font-extrabold text-foreground text-base sm:text-lg leading-snug hover:text-primary">
            {wheel.title}
          </h2>
        </Link>
        {wheel.description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
            {wheel.description}
          </p>
        )}
      </div>

      {/* Vertical Feed-Optimized Wheel Showcase (Zero-canvas static graphic with CTA pill) */}
      <div className="px-4 sm:px-0">
        <Link
          href={wheelUrl}
          className="relative block w-full aspect-square max-w-[200px] sm:max-w-[220px] max-h-[220px] mx-auto rounded-2xl bg-muted/20 border border-border/50 overflow-hidden p-2 sm:p-2.5"
        >
          {/* Wheel Graphic Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={wheel.title}
                width={220}
                height={220}
                className="w-full h-full object-contain drop-shadow-md"
                onError={() => {
                  if (imgSrc !== wheel.wheelPreview && wheel.wheelPreview) {
                    setImgSrc(wheel.wheelPreview);
                  } else {
                    setImgSrc(null);
                  }
                }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-dashed border-border/60 flex items-center justify-center">
                <span className="text-3xl font-black text-muted-foreground/30">
                  {wheel.title?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Floating Pill CTA */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/80 text-foreground font-black text-xs tracking-wide shadow-lg">
                <Play size={11} fill="currentColor" />
                <span>SPIN WHEEL</span>
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Tags */}
      {wheel.tags && wheel.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 sm:px-0 mt-2.5 pt-1">
          {wheel.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-0.5 bg-primary/10 text-primary"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Memo prevents unnecessary re-renders when InfiniteFeedStream's parent state
// changes (e.g., scroll/load-more). Ads are rendered outside this component,
// so they are unaffected. Internal hooks/state still work normally.
export default memo(WheelFeedCard);
