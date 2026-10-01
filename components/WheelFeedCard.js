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
    <div className="border-b border-border/40 bg-card/60 dark:bg-muted/20 sm:shadow-2xs py-4 sm:border sm:border-border/60 sm:rounded-2xl sm:px-5 sm:py-6 transition-all duration-200 hover:bg-card hover:shadow-xs dark:hover:bg-muted/30 sm:mb-0">
      {/* Header: Author + Time + Menu */}
      <div className="flex items-center justify-between gap-2 mb-3 px-4 sm:px-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {firstLetter}
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <Link
                href={`/u/${encodeURIComponent(authorHandle.toLowerCase())}`}
                className="font-bold text-foreground hover:underline transition truncate"
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

      {/* Sleek Compact Media Badge with Large Wheel Graphic */}
      <Link
        href={wheelUrl}
        className="group flex flex-row items-center gap-3.5 sm:gap-5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-primary/40 transition-all duration-200 shadow-2xs hover:shadow-xs mx-0 sm:mx-0"
      >
        {/* Large Wheel Image Container */}
        <div className="relative flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-lg sm:rounded-xl bg-background/90 border border-border/50 overflow-hidden flex items-center justify-center p-1.5 shadow-inner">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={wheel.title}
              width={160}
              height={160}
              className="w-full h-full object-contain drop-shadow-md group-hover:rotate-12 group-hover:scale-105 transition-transform duration-500 ease-out"
              onError={() => {
                if (imgSrc !== wheel.wheelPreview && wheel.wheelPreview) {
                  setImgSrc(wheel.wheelPreview);
                } else {
                  setImgSrc(null);
                }
              }}
            />
          ) : (
            <span className="text-3xl sm:text-4xl font-black text-muted-foreground/30 group-hover:scale-110 transition-transform">
              {wheel.title?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
          <div>
            <h3 className="font-bold text-foreground text-base sm:text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {wheel.title}
            </h3>
            {wheel.description ? (
              <p className="text-sm sm:text-[15px] text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                {wheel.description}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground/60 italic mt-1">
                Tap to spin this custom wheel
              </p>
            )}
          </div>

          {/* Bottom Action Row */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/30">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              Interactive Wheel
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-2xs group-hover:bg-primary/90 group-active:scale-95 transition-all">
              <Play size={11} fill="currentColor" /> Spin
            </span>
          </div>
        </div>
      </Link>

      {/* Tags */}
      {wheel.tags && wheel.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 sm:px-0 mt-3">
          {wheel.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 transition"
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
