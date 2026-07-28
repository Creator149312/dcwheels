"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ImageIcon, BarChart2, CircleDashed } from "lucide-react";
import { useLoginPrompt } from "@app/LoginPromptProvider";

export default function CreatePostTeaser({ defaultTag = "", className = "", contentRef = null }) {
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const handleInputClick = (e) => {
    if (!session) {
      e.preventDefault();
      openLoginPrompt();
    }
  };

  // Build creation URL with optional tag and contentRef metadata (for TopicPage sources)
  let createUrl = "/post/create";
  const params = new URLSearchParams();

  if (defaultTag) params.set("tag", defaultTag);
  if (contentRef) {
    params.set("cr_type", contentRef.type || "");
    params.set("cr_id", contentRef.externalId || "");
    params.set("cr_slug", contentRef.slug || "");
    params.set("cr_title", contentRef.title || "");
    params.set("cr_image", contentRef.image || "");
  }

  const queryString = params.toString();
  if (queryString) createUrl += `?${queryString}`;

  return (
    <div className={`border-b sm:border border-border/40 bg-card p-3 sm:rounded-xl shadow-sm sm:px-4 sm:py-3 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Avatar - visible on both now for that premium FB feel */}
        <div className="flex flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/20 items-center justify-center text-xs sm:text-sm font-bold text-primary">
          {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "?"}
        </div>
        
        {/* Input Trigger */}
        <Link
          href={createUrl}
          onClick={handleInputClick}
          className="flex-1 overflow-hidden"
        >
          <div className="bg-muted/50 hover:bg-muted text-muted-foreground rounded-full px-4 py-2 sm:py-2 text-[11px] sm:text-sm transition-colors font-medium border border-border/50 truncate">
            What&apos;s on your mind{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}?
          </div>
        </Link>

        {/* Quick Action Icons - All visible on both desktop & mobile */}
        <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
          <Link 
            href={createUrl}
            onClick={handleInputClick}
            className="p-2 rounded-full hover:bg-muted transition-colors flex items-center justify-center group"
            title="Image/Video"
          >
            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 group-hover:scale-110 transition-transform" strokeWidth={2} />
          </Link>
          <Link 
            href={createUrl + (queryString ? "&poll=true" : "?poll=true")}
            onClick={handleInputClick}
            className="p-2 rounded-full hover:bg-muted transition-colors flex items-center justify-center group"
            title="Poll"
          >
            <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
          </Link>
          <Link 
            href={"/wheels/create" + (queryString ? `?${queryString}` : "")}
            onClick={handleInputClick}
            className="p-2 rounded-full hover:bg-muted transition-colors flex items-center justify-center group"
            title="Spin Wheel"
          >
            <CircleDashed className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}