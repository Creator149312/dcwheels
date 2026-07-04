"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { timeAgo } from "@utils/HelperFunctions";
import { Play } from "lucide-react";
import WheelMenu from "./WheelMenu";

/**
 * WheelFeedCard — renders a full-width social feed card for a wheel.
 * Mimics the look of PostCard to sit interchangeably in the same stream.
 */
export default function WheelFeedCard({ wheel }) {
  const { data: session } = useSession();
  const [isHidden, setIsHidden] = useState(false);
  const wheelUrl = `/uwheels/${wheel._id || wheel.id}`;
  const authorName = wheel.authorName || "Community";
  const authorHandle = wheel.authorHandle || authorName;

  const isOwner = session?.user?.username === authorHandle || session?.user?.name === authorName;

  const firstLetter = authorName.charAt(0).toUpperCase();
  const thumbSrc = wheel.wheelPreview
    ? wheel.wheelPreview.replace('.webp', '-thumb.webp')
    : null;

  // Render simplified "hidden" state if user deletes or hides
  if (isHidden) {
    return (
      <div className="border-b border-border/70 bg-card px-4 py-3 sm:border sm:rounded-2xl flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Wheel hidden</span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-primary text-xs font-semibold hover:underline"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="border-b sm:border border-border/80 bg-card p-4 sm:p-5 sm:rounded-2xl transition hover:bg-muted/[0.04]">
      {/* Header: Author + Time + Menu */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {firstLetter}
          </div>
          <div className="leading-tight">
            <Link
              href={`/u/${encodeURIComponent(authorHandle.toLowerCase())}`}
              className="font-bold text-foreground hover:underline transition text-sm flex items-center gap-1"
            >
              <span>{authorName}</span>
              {isOwner && !wheel.isPublic && (
                <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0 rounded-full font-bold ml-1 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                   Private
                </span>
              )}
            </Link>
            <p className="text-[10px] font-semibold text-muted-foreground/85">
              {timeAgo(wheel.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Menu */}
        <WheelMenu 
          wheelId={wheel._id || wheel.id} 
          isPublic={wheel.isPublic}
          authorHandle={authorHandle}
          onDeleted={() => setIsHidden(true)}
        />
      </div>

      {/* Title */}
      <h3 className="font-bold text-foreground mb-2 text-base sm:text-lg leading-snug">
        <Link href={wheelUrl} className="hover:text-primary transition">
          {wheel.title}
        </Link>
      </h3>

      {/* Content (Description) */}
      {wheel.description && (
        <p className="text-sm text-foreground/80 mb-4 whitespace-pre-wrap line-clamp-3">
          {wheel.description}
        </p>
      )}

      <div className="mb-4">
        <Link href={wheelUrl} className="block group relative w-full aspect-video sm:aspect-[21/9] bg-muted/20 sm:rounded-2xl overflow-hidden border border-border/40 transition isolate">
          {/* Wheel Graphic */}
          <div className="absolute inset-0 flex items-center justify-center py-4 bg-background/50 backdrop-blur-[2px] group-hover:bg-background/20 transition-colors z-0">
            {thumbSrc ? (
              <Image
                src={thumbSrc}
                alt={wheel.title}
                width={300}
                height={300}
                className="h-full w-auto object-contain drop-shadow-2xl group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              />
            ) : (
             <span className="text-muted/40 text-7xl font-black group-hover:scale-105 transition-transform">
                {wheel.title?.charAt(0).toUpperCase()}
             </span>
            )}
          </div>
          
          {/* Play CTA Overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
             <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/90 text-primary-foreground backdrop-blur-sm shadow-md font-black text-xs uppercase tracking-wider group-hover:bg-primary transition-colors group-active:scale-95 duration-100">
               <Play size={14} fill="currentColor" /> Spin Wheel
             </div>
          </div>
        </Link>
      </div>

      {/* Tags */}
      {wheel.tags && wheel.tags.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-2">
          {wheel.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 transition"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
