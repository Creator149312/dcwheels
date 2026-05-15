"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import StatsBar from "@app/(content)/[type]/StatsBar";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { MessageSquare, Code2, ArrowLeftRight } from "lucide-react";
import { timeAgo } from "@utils/HelperFunctions";

// Lazy-load on interaction only — removes comment thread + embed form from
// the initial JS parse path, cutting TBT.
const CommentsPanel = dynamic(() => import("./comments/CommentsPanel"), { ssr: false });
const EmbedCodePopup = dynamic(() => import("@components/EmbedCodePopup"), { ssr: false });

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
 *   initialMeta — server-fetched meta: analytics, reactions, commentCount
 */
export default function WheelInfoActions({ wheelId, createdAt, createdBy, initialMeta = null }) {
  const openLoginPrompt = useLoginPrompt();
  const { data: session } = useSession();

  const [engagement, setEngagement] = useState({
    view_count: initialMeta?.analytics?.view_count || 0,
    spin_count: initialMeta?.analytics?.spin_count || 0,
  });
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(initialMeta?.commentCount || 0);
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      try {
        const res = await fetch(`/api/wheel-analytics/${wheelId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!ignore) {
          setEngagement({
            view_count: json?.analytics?.view_count || 0,
            spin_count: json?.analytics?.spin_count || 0,
          });
        }
      } catch {
        // Silent analytics failure by design.
      }
    }

    // Only fetch if SSR didn't seed us (e.g. cold render without initialMeta).
    if (!initialMeta) {
      loadAnalytics();

      fetch(`/api/comments/count?entityType=wheel&entityId=${wheelId}`)
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .then((d) => { if (!ignore) setCommentCount(d.count || 0); })
        .catch(() => {});
    }

    // Optimistic spin counter — no fetch, just increment locally.
    const onSpinCounted = (event) => {
      if (event?.detail?.wheelId !== wheelId) return;
      setEngagement((prev) => ({
        ...prev,
        spin_count: (prev.spin_count || 0) + 1,
      }));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("wheel:spin-counted", onSpinCounted);
    }

    return () => {
      ignore = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("wheel:spin-counted", onSpinCounted);
      }
    };
  }, [wheelId, initialMeta]);

  return (
    <div className="w-full px-4 text-left text-gray-900 dark:text-gray-100 mb-3 block md:flex md:items-center md:justify-between md:gap-4">
      {/* Creator avatar + stats line in one row */}
      <div className="flex items-center justify-start gap-3 mb-3 md:mb-0">
        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-black dark:text-white flex-shrink-0">
          {createdBy ? createdBy.charAt(0).toUpperCase() : ""}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {formatCount(engagement.view_count)} views
          <span className="mx-1.5">•</span>
          <ArrowLeftRight className="inline -mt-0.5 mr-0.5" size={14} />
          {formatCount(engagement.spin_count)} spins
          <span className="mx-1.5">•</span>
          {timeAgo(createdAt)}
        </p>
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <StatsBar
          entityType="wheel"
          entityId={wheelId}
          session={session}
          initialStats={
            initialMeta
              ? {
                  reactions: initialMeta.reactions,
                  reactedByUser: initialMeta.reactedByUser,
                }
              : null
          }
          show={{ like: true, share: true, save: false, follow: false }}
        />

        <button
          onClick={() => {
            setShowComments((prev) => !prev);
            if (!showComments) {
              setTimeout(() => {
                const el = document.getElementById("comments");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#3a3a3a] text-gray-800 dark:text-gray-100 text-sm font-medium transition"
        >
          <MessageSquare className="text-gray-600 dark:text-gray-300" size={16} />
          <span>Comments{commentCount > 0 ? ` (${commentCount})` : ""}</span>
        </button>

        <button
          onClick={() => setShowEmbed(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#3a3a3a] text-gray-800 dark:text-gray-100 text-sm font-medium transition"
        >
          <Code2 className="text-gray-600 dark:text-gray-300" size={16} />
          <span>Embed</span>
        </button>
      </div>

      {/* Comments panel — lazy, only mounts after user clicks */}
      <CommentsPanel
        entityType="wheel"
        entityId={wheelId}
        isLoggedIn={!!session}
        openLoginPrompt={openLoginPrompt}
        currentUser={session?.user}
        visible={showComments}
      />

      {showEmbed && (
        <EmbedCodePopup wheelId={wheelId} onClose={() => setShowEmbed(false)} />
      )}
    </div>
  );
}
