"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import StatsBar from "@app/(content)/[type]/StatsBar";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { FaComment, FaCode } from "react-icons/fa";
import { TbSwitch3 } from "react-icons/tb";
import CommentsPanel from "./comments/CommentsPanel";
import { timeAgo } from "@utils/HelperFunctions";
import Description from "./description/Description";
import EmbedCodePopup from "@components/EmbedCodePopup";

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : "";
}

function formatCount(n) {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

export default function WheelInfoSection({
  wordsList,
  session: sessionProp,
  wheelId,
  pageData = null,
  initialMeta = null,
}) {
  const openLoginPrompt = useLoginPrompt();
  // Support both the legacy "session prop from SSR" path and the new
  // "resolve session client-side" path used by CDN-cacheable pages.
  const { data: hookSession } = useSession();
  const session = sessionProp ?? hookSession;
  const [engagement, setEngagement] = useState({
    view_count: initialMeta?.analytics?.view_count || 0,
    spin_count: initialMeta?.analytics?.spin_count || 0,
  });
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(initialMeta?.commentCount || 0);
  const [showEmbed, setShowEmbed] = useState(false);
  useEffect(() => {
    let ignore = false;

    // Skip initial analytics + comment count fetch when SSR provided them.
    // We still attach the spin-counted event listener below.
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

    if (!initialMeta) {
      loadAnalytics();

      // Fetch comment count (lightweight — just the count, not full comments)
      fetch(`/api/comments/count?entityType=wheel&entityId=${wheelId}`)
        .then((r) => r.ok ? r.json() : { count: 0 })
        .then((d) => { if (!ignore) setCommentCount(d.count || 0); })
        .catch(() => {});
    }

    const onSpinCounted = (event) => {
      const eventWheelId = event?.detail?.wheelId;
      if (eventWheelId !== wheelId) return;
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
    <div className="mt-4 sm:mt-6 max-w-7xl mx-auto px-2 sm:px-4 text-gray-900 dark:text-gray-100">
      {/* Title */}
      <h1 className="text-xl sm:text-2xl font-semibold mb-0.5">
        {wordsList.title}
      </h1>

      {/* YouTube-style stats line: views • spins • time ago */}
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        {formatCount(engagement.view_count)} views
        <span className="mx-1.5">•</span>
        <TbSwitch3 className="inline -mt-0.5 mr-0.5" />
        {formatCount(engagement.spin_count)} spins
        <span className="mx-1.5">•</span>
        {timeAgo(wordsList.createdAt)}
      </p>

      {/* Creator + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {/* Left: Creator Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-black dark:text-white">
            {getInitial(wordsList?.createdBy)}
          </div>
          {/* <div className="flex flex-col">
            <span className="font-semibold">{username}</span>
          </div> */}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-4 text-sm">
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
            show={{
              like: true,
              share: true,
              save: false,
              follow: false,
            }}
          />
          <button
            onClick={() => {
              setShowComments((prev) => !prev);
              if (!showComments) {
                // Scroll to comments section after it renders
                setTimeout(() => {
                  const el = document.getElementById("comments");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#3a3a3a] text-gray-800 dark:text-gray-100 text-sm font-medium transition"
          >
            <FaComment className="text-gray-600 dark:text-gray-300" />
            <span>Comments{commentCount > 0 ? ` (${commentCount})` : ""}</span>
          </button>

          {/* Embed button */}
          <button
            onClick={() => setShowEmbed(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#3a3a3a] text-gray-800 dark:text-gray-100 text-sm font-medium transition"
          >
            <FaCode className="text-gray-600 dark:text-gray-300" />
            <span>Embed</span>
          </button>
        </div>
      </div>

      {/* Description */}
      <Description pageData={pageData} wordsList={wordsList} />

      {/* Comments — only load when user clicks the Comments button */}
      <CommentsPanel
        entityType="wheel"
        entityId={wheelId}
        isLoggedIn={!!session}
        openLoginPrompt={openLoginPrompt}
        currentUser={session?.user}
        visible={showComments}
      />

      {/* Embed code popup */}
      {showEmbed && (
        <EmbedCodePopup wheelId={wheelId} onClose={() => setShowEmbed(false)} />
      )}
    </div>
  );
}
