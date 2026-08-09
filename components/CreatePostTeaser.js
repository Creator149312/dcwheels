"use client";

import { useMemo, memo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ImageIcon, BarChart2, CircleDashed } from "lucide-react";
import { useLoginPrompt } from "@app/LoginPromptProvider";

function CreatePostTeaser({ defaultTag = "", className = "", contentRef = null }) {
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const handleInputClick = (e) => {
    if (!session) {
      e.preventDefault();
      openLoginPrompt();
    }
  };

  // Build creation URL once per prop change instead of every render.
  const { createUrl, pollUrl, wheelUrl } = useMemo(() => {
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
    const base = "/post/create";
    const wheelBase = "/wheels/create";
    const create = queryString ? `${base}?${queryString}` : base;
    const poll = queryString ? `${base}?${queryString}&poll=true` : `${base}?poll=true`;
    const wheel = queryString ? `${wheelBase}?${queryString}` : wheelBase;

    return { createUrl: create, pollUrl: poll, wheelUrl: wheel };
  }, [defaultTag, contentRef]);

  const firstName = session?.user?.name ? session.user.name.split(" ")[0] : "";
  const avatarInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : "?";

  return (
    <div className={`bg-card p-3 sm:rounded-2xl shadow-sm sm:px-4 sm:py-3 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Avatar */}
        <div className="flex flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 items-center justify-center text-xs sm:text-sm font-black text-primary">
          {avatarInitial}
        </div>

        {/* Input Trigger — high-contrast, branded shell so it pops */}
        <Link
          href={createUrl}
          onClick={handleInputClick}
          className="flex-1 min-w-0"
        >
          <div className="group relative rounded-full px-4 py-2 sm:py-2.5 bg-background transition-all duration-200">
            {/* Gradient ring draws the eye without adding layout size */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/40 via-pink-500/30 to-primary/40 p-[1.5px]" aria-hidden="true" />
            <div className="absolute inset-[1.5px] rounded-full bg-background" aria-hidden="true" />
            <span className="relative block text-[11px] sm:text-sm font-semibold text-foreground/80 group-hover:text-foreground truncate">
              What&apos;s on your mind{firstName ? `, ${firstName}` : ""}?
            </span>
          </div>
        </Link>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-muted-foreground">
          <QuickIconLink
            href={createUrl}
            onClick={handleInputClick}
            icon={ImageIcon}
            colorClass="text-emerald-500"
            label="Image/Video"
          />
          <QuickIconLink
            href={pollUrl}
            onClick={handleInputClick}
            icon={BarChart2}
            colorClass="text-pink-500"
            label="Poll"
          />
          <QuickIconLink
            href={wheelUrl}
            onClick={handleInputClick}
            icon={CircleDashed}
            colorClass="text-violet-500"
            label="Spin Wheel"
          />
        </div>
      </div>
    </div>
  );
}

function QuickIconLink({ href, onClick, icon: Icon, colorClass, label }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all flex items-center justify-center group"
      title={label}
      aria-label={label}
    >
      <Icon
        className={`w-5 h-5 sm:w-6 sm:h-6 ${colorClass} group-hover:scale-110 transition-transform`}
        strokeWidth={2}
      />
    </Link>
  );
}

// Memo prevents the teaser from re-rendering every time the parent feed updates.
// The only props that should invalidate it are the creation metadata.
export default memo(CreatePostTeaser);