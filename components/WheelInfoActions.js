"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import StatsBar from "@app/(content)/[type]/StatsBar";
import QuickSaveButton from "@components/QuickSaveButton";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { MessageSquare, Code2, ArrowLeftRight, BarChart2 } from "lucide-react";
import { timeAgo } from "@utils/HelperFunctions";

// Lazy-load on interaction only — removes embed and stats modal from
// the initial JS parse path, cutting TBT.
const EmbedCodePopup = dynamic(() => import("@components/EmbedCodePopup"), { ssr: false });
const WheelSpinStatsModal = dynamic(() => import("@components/WheelSpinStatsModal"), { ssr: false });

function formatCount(n) {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

/**
 * WheelInfoActions — interactive client layer for wheel info.
 *
 * Handles everything that requires JS or live data:
 *   - Views/spins counter (optimistically updated on spin events)
 *   - Reaction buttons (like, share) via StatsBar + useSession()
 *   - Comments toggle + CommentsPanel (lazy-loaded on click)
 *   - Embed code popup (lazy-loaded on click)
 *
 * Rendered inside a Suspense boundary in SuspendedMetaSection so it
 * always receives SSR-seeded `initialMeta` and never issues its own
 * analytics fetch on mount.
 *
 * Props:
 *   wheelId    — MongoDB ObjectId string for the wheel
 *   createdAt  — ISO date string from the wheel document (for "X days ago")
 *   createdBy  — Creator name/username for display
 *   authorHandle — Creator username for profile link routing
 *   initialMeta — server-fetched meta: analytics, reactions, commentCount
 */
export default function WheelInfoActions({ wheelId, wheelTitle, wheelEntityType = "wheel", wheelSlug = "", createdAt, authorHandle, initialMeta = null }) {
  const openLoginPrompt = useLoginPrompt();
  const { data: session } = useSession();

  const [engagement, setEngagement] = useState({
    view_count: initialMeta?.analytics?.view_count || 0,
    spin_count: initialMeta?.analytics?.spin_count || 0,
  });
  const [commentCount, setCommentCount] = useState(initialMeta?.commentCount || 0);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showSpinStats, setShowSpinStats] = useState(false);

  const displayCreator = authorHandle || "Community";

  useEffect(() => {
    let ignore = false;

    async function setMissingMeta() {
      try {
        const res = await fetch(`/api/wheel/${wheelId}/meta`);
        if (!res.ok) return;
        const json = await res.json();
        if (!ignore && json.meta) {
          setEngagement({
            view_count: json.meta.analytics?.view_count || 0,
            spin_count: json.meta.analytics?.spin_count || 0,
          });
          setCommentCount(json.meta.commentCount || 0);
        }
      } catch (e) {
        // Silent failure by design
      }
    }

    // Only fetch if SSR didn't seed us (e.g. cold render without initialMeta).
    if (!initialMeta) {
      setMissingMeta();
    }

    // Optimistic spin & view counters — no fetch, just increment locally.
    const onSpinCounted = (event) => {
      if (event?.detail?.wheelId !== wheelId) return;
      setEngagement((prev) => ({
        ...prev,
        spin_count: (prev.spin_count || 0) + 1,
      }));
    };

    const onViewCounted = (event) => {
      if (event?.detail?.wheelId !== wheelId) return;
      setEngagement((prev) => ({
        ...prev,
        view_count: (prev.view_count || 0) + 1,
      }));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("wheel:spin-counted", onSpinCounted);
      window.addEventListener("wheel:view-counted", onViewCounted);
    }

    return () => {
      ignore = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("wheel:spin-counted", onSpinCounted);
        window.removeEventListener("wheel:view-counted", onViewCounted);
      }
    };
  }, [wheelId, initialMeta]);

  return (
    <div className="w-full px-2 sm:px-3 text-left text-foreground mb-1">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Avatar + Stats */}
        <div className="flex items-center gap-2">
          {authorHandle ? (
            <Link href={`/u/${encodeURIComponent(authorHandle)}`} className="hover:opacity-80 transition flex-shrink-0">
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                {displayCreator ? displayCreator.charAt(0).toUpperCase() : ""}
              </div>
            </Link>
          ) : (
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
              {displayCreator ? displayCreator.charAt(0).toUpperCase() : ""}
            </div>
          )}
          
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
            <span>{formatCount(engagement.view_count)} views</span>
            <span className="opacity-40">•</span>
            <button
              type="button"
              onClick={() => setShowSpinStats(true)}
              className="inline-flex items-center gap-1 hover:text-primary transition font-medium group cursor-pointer"
              title="View Spin Distribution & Pro Analytics"
            >
              <span>{formatCount(engagement.spin_count)} spins</span>
              <BarChart2 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <StatsBar
            entityType="wheel"
            entityId={wheelId}
            session={session}
            knownCounts={{
              like: initialMeta?.reactions?.like || 0,
            }}
            initialStats={
              initialMeta
                ? {
                    reactions: initialMeta.reactions,
                    reactedByUser: initialMeta.reactedByUser,
                  }
                : null
            }
            show={{ like: true, share: true, save: false, follow: false, comment: true }}
            commentCount={commentCount}
            onCommentClick={() => {
              if (window.innerWidth < 768) {
                // Phase 3: Mobile Detail -> Simple custom event to open the drawer
                window.dispatchEvent(new CustomEvent("comments:open-drawer", {
                  detail: { entityId: String(wheelId) }
                }));
              } else {
                // Desktop -> Scroll to the comments section AND focus input
                const el = document.getElementById("comments-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                  // Focus the comment textarea
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("comment-form:focus"));
                  }, 300);
                }
              }
            }}
          />

          <QuickSaveButton
            entityType={wheelEntityType}
            entityId={wheelId}
            itemTitle={wheelTitle}
            itemSlug={wheelSlug || wheelId}
            variant="button"
          />

          <button
            onClick={() => setShowEmbed(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent text-foreground transition-all leading-none shadow-sm h-8 md:h-9 flex-shrink-0 cursor-pointer"
            title="Embed Wheel"
          >
            <Code2 size={16} />
            <span className="text-sm font-medium">Embed</span>
          </button>
        </div>
      </div>

      {showEmbed && (
        <EmbedCodePopup wheelId={wheelId} onClose={() => setShowEmbed(false)} />
      )}

      {showSpinStats && (
        <WheelSpinStatsModal
          isOpen={showSpinStats}
          onClose={() => setShowSpinStats(false)}
          wheelId={wheelId}
          wheelTitle={wheelTitle}
        />
      )}
    </div>
  );
}
