"use client";

import { useEffect, useState } from "react";
import StatsBar from "@app/(content)/[type]/StatsBar";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { FaComment } from "react-icons/fa";
import Link from "next/link";
import CommentsPanel from "./comments/CommentsPanel";
import QuestionsPanel from "@components/qna/QuestionsPanel";
import { timeAgo } from "@utils/HelperFunctions";
import Description from "./description/Description";

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : "";
}

export default function WheelInfoSection({
  wordsList,
  session,
  wheelId,
  pageData = null,
}) {
  const openLoginPrompt = useLoginPrompt();
  const [engagement, setEngagement] = useState({ view_count: 0, spin_count: 0 });
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

    loadAnalytics();

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
  }, [wheelId]);

  // const [username, setUsername] = useState("");

  // useEffect(() => {
  //   async function fetchUsername() {
  //     if (wordsList?.createdBy) {
  //       try {
  //         const res = await fetch(`/api/user?email=${wordsList.createdBy}`);
  //         if (res.ok) {
  //           const data = await res.json();
  //           setUsername(data.name);
  //         }
  //       } catch (err) {
  //         console.error("Failed to fetch username", err);
  //       }
  //     }
  //   }
  //   fetchUsername();
  // }, [wordsList?.createdBy]);

  return (
    <div className="mt-2 px-4 text-gray-900 dark:text-gray-100">
      {/* Title */}
      <h1 className="text-xl sm:text-2xl font-semibold mb-3">
        {wordsList.title}
      </h1>

      {/* Creator + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
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
        <div className="flex items-center gap-4 text-sm lg:mr-48">
          <StatsBar
            entityType="wheel"
            entityId={wheelId}
            session={session}
            show={{
              like: true,
              share: true,
              save: false,
              follow: false,
            }}
          />
          <Link
            href="/help-me-decide"
            className="px-3 py-1.5 rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
          >
            Help Me Decide Feed
          </Link>
          <button
            onClick={() => {
              const el = document.getElementById("comments");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#3a3a3a] text-gray-800 dark:text-gray-100 text-sm font-medium transition"
          >
            <FaComment className="text-gray-600 dark:text-gray-300" />
            <span>Comments</span>
          </button>
        </div>
      </div>

      {/* Date */}
      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-4">
        {timeAgo(wordsList.createdAt)}
      </p>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Viewed {engagement.view_count.toLocaleString()} times • Spun {engagement.spin_count.toLocaleString()} times
      </p>

      {/* Description */}
      <Description pageData={pageData} wordsList={wordsList} />

      {/* Ask the Crowd */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Ask the Crowd</h2>
          <span className="text-xs text-gray-500">
            Published here and on the Help Me Decide feed
          </span>
        </div>
        <QuestionsPanel
          type="wheel"
          contentId={wheelId}
          isLoggedIn={!!session}
          openLoginPrompt={openLoginPrompt}
          currentUserId={session?.user?.id}
          layout="vertical"
        />
      </section>

      {/* Comments */}
      <CommentsPanel
        entityType="wheel"
        entityId={wheelId}
        isLoggedIn={!!session}
        openLoginPrompt={openLoginPrompt}
        currentUser={session?.user}
        visible={true}
      />
    </div>
  );
}
