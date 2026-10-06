"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageIcon, BarChart2, CircleDashed, User } from "lucide-react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import InlineQuickComposer from "@components/InlineQuickComposer";

// Contextual prompt suggestions based on active category/tag — universal and flicker-free
function getPromptText(tag) {
  const norm = (tag || "").toLowerCase().trim();

  if (norm.includes("anime") || norm.includes("manga") || norm.includes("character")) {
    return "Drop a hot take or compare two characters...";
  }
  if (norm.includes("travel") || norm.includes("dest") || norm.includes("city") || norm.includes("place")) {
    return "Ask for recommendations or compare destinations...";
  }
  if (norm.includes("book") || norm.includes("read") || norm.includes("author") || norm.includes("novel")) {
    return "Share a review or compare favorite reads...";
  }
  if (norm.includes("game") || norm.includes("gaming") || norm.includes("rpg")) {
    return "Debate builds, tier lists, or compare games...";
  }
  if (norm.includes("movie") || norm.includes("film") || norm.includes("tv")) {
    return "Compare movies, scenes, or actors...";
  }
  if (norm.includes("food") || norm.includes("recipe")) {
    return "Compare dishes, snacks, or restaurants...";
  }
  return "Ask a question, share a thought, or compare...";
}

function CreatePostTeaser({ defaultTag = "", className = "", contentRef = null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const openLoginPrompt = useLoginPrompt();

  // Inline composer open state: null | "text" | "photo" | "poll"
  const [composerMode, setComposerMode] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen width on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleTriggerClick = (e, mode) => {
    e.preventDefault();
    if (!session) {
      openLoginPrompt();
      return;
    }
    setComposerMode(mode);
  };

  // Prefetch create route into Next.js cache on hover/focus as a fallback
  const handlePrefetch = () => {
    router.prefetch("/posts/create");
    router.prefetch("/wheels/create");
  };

  // Build creation URL once per prop change instead of every render.
  const { createUrl, imageUrl, pollUrl, wheelUrl } = useMemo(() => {
    const params = new URLSearchParams();
    if (defaultTag) params.set("tag", defaultTag);
    if (contentRef) {
      if (contentRef.type) params.set("cr_type", contentRef.type);
      if (contentRef.externalId) params.set("cr_id", contentRef.externalId);
      if (contentRef.slug) params.set("cr_slug", contentRef.slug);
      if (contentRef.title) params.set("cr_title", contentRef.title.slice(0, 100));
      // Only attach URL if it's not a heavy data: URL
      if (contentRef.image && !contentRef.image.startsWith("data:") && contentRef.image.length < 500) {
        params.set("cr_image", contentRef.image);
      }
    }

    const queryString = params.toString();
    const base = "/posts/create";
    const wheelBase = "/wheels/create";
    const create = queryString ? `${base}?${queryString}` : base;
    const image = queryString ? `${base}?${queryString}&image=1` : `${base}?image=1`;
    const poll = queryString ? `${base}?${queryString}&poll=true` : `${base}?poll=true`;
    const wheel = queryString ? `${wheelBase}?${queryString}` : wheelBase;

    return { createUrl: create, imageUrl: image, pollUrl: poll, wheelUrl: wheel };
  }, [defaultTag, contentRef]);

  const avatarInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : null;

  const placeholderText = useMemo(
    () => getPromptText(defaultTag),
    [defaultTag]
  );

  // If composer is opened:
  // On mobile (<768px): render as a bottom-sheet modal to prevent virtual keyboard clutter
  // On desktop (>=768px): render inline in-feed
  if (composerMode) {
    if (isMobile) {
      return (
        <div className={className}>
          <div
            className={`bg-card p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-border/50 shadow-xs`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 items-center justify-center text-xs font-black text-primary">
                {avatarInitial ? avatarInitial : <User className="w-4 h-4 text-muted-foreground/80" strokeWidth={2.2} />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="group relative rounded-2xl px-4 py-2 bg-background/80 border border-primary/40">
                  <span className="block text-xs font-medium text-foreground truncate">
                    {placeholderText}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <InlineQuickComposer
            mode="modal"
            defaultTag={defaultTag}
            contentRef={contentRef}
            initialMode={composerMode}
            onClose={() => setComposerMode(null)}
          />
        </div>
      );
    }

    return (
      <div className={className}>
        <InlineQuickComposer
          mode="inline"
          defaultTag={defaultTag}
          contentRef={contentRef}
          initialMode={composerMode}
          onClose={() => setComposerMode(null)}
        />
      </div>
    );
  }

  return (
    <div
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      className={`bg-card p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-border/50 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Avatar — Sleek User icon when unauthenticated or loading, user initial once authenticated */}
        <div className="flex flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 items-center justify-center text-xs font-black text-primary">
          {avatarInitial ? (
            avatarInitial
          ) : (
            <User className="w-4 h-4 text-muted-foreground/80" strokeWidth={2.2} />
          )}
        </div>

        {/* Input Trigger — expands inline without page hopping */}
        <button
          type="button"
          onClick={(e) => handleTriggerClick(e, "text")}
          className="flex-1 min-w-0 text-left"
        >
          <div className="group relative rounded-2xl px-4 py-2 sm:py-2.5 bg-background/80 hover:bg-background border border-border/60 hover:border-primary/40 transition-all duration-200 shadow-2xs">
            <span className="block text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground truncate">
              {placeholderText}
            </span>
          </div>
        </button>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-muted-foreground shrink-0">
          <button
            type="button"
            onClick={(e) => handleTriggerClick(e, "photo")}
            className="p-2 sm:p-2.5 rounded-full hover:bg-muted active:scale-95 transition-all flex items-center justify-center group min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]"
            title="Photo"
            aria-label="Photo"
          >
            <ImageIcon
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-emerald-500 group-hover:scale-110 transition-transform"
              strokeWidth={2}
            />
          </button>

          <button
            type="button"
            onClick={(e) => handleTriggerClick(e, "poll")}
            className="p-2 sm:p-2.5 rounded-full hover:bg-muted active:scale-95 transition-all flex items-center justify-center group min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]"
            title="Compare / VS Poll"
            aria-label="Compare / VS Poll"
          >
            <BarChart2
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-pink-500 group-hover:scale-110 transition-transform"
              strokeWidth={2}
            />
          </button>

          <Link
            href={wheelUrl}
            prefetch={true}
            className="p-2 sm:p-2.5 rounded-full hover:bg-muted active:scale-95 transition-all flex items-center justify-center group min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]"
            title="Spin Wheel"
            aria-label="Spin Wheel"
          >
            <CircleDashed
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-violet-500 group-hover:scale-110 transition-transform"
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Memo prevents the teaser from re-rendering every time the parent feed updates.
// The only props that should invalidate it are the creation metadata.
export default memo(CreatePostTeaser);