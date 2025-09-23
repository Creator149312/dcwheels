"use client";

import StatsBar from "@app/(content)/[type]/StatsBar";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { FaComment } from "react-icons/fa";
import CommentsPanel from "./comments/CommentsPanel";
import { timeAgo } from "@utils/HelperFunctions";
import Description from "./description/Description";

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : "";
}

export default function WheelInfoSection({
  wordsList,
  session,
  wheelId,
  username,
  pageData = null,
}) {
  const openLoginPrompt = useLoginPrompt();

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
            {getInitial(username)}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">{username}</span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-4 text-sm lg:mr-48">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
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
      </div>

      {/* Date */}
      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-4">
        {timeAgo(wordsList.createdAt)}
      </p>

      {/* Description */}
      <Description pageData={pageData} wordsList={wordsList} />

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
