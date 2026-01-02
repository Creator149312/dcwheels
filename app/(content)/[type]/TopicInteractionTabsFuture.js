"use client";

import { useState } from "react";
import CreateWheelButton from "./CreateWheelButton";
import ReviewsPanel from "@components/review/ReviewsPanel";
import QuestionsPanel from "@components/qna/QuestionsPanel";
import { useLoginPrompt } from "@app/LoginPromptProvider";

export default function TopicInteractionTabs({
  type, // e.g., "movie", "anime", "game"
  pageId,
  contentId, // string or ObjectId
  taggedWheels = [],
  isLoggedIn, // boolean from session
  currentUserId, // optional: for marking user's own votes/likes in UI
}) {
  // const [activeTab, setActiveTab] = useState("wheels"); // "wheels" | "reviews" | "qa"

  // const tabBase = "px-1 py-2 text-sm font-medium border-b-2 transition-colors";
  // const activeTabClass = "border-blue-600 text-blue-600";
  // const inactiveTabClass =
  //   "border-transparent text-gray-600 dark:text-gray-300 hover:text-blue-600";

  const openLoginPrompt = useLoginPrompt();

  return (
    <section className="mt-6 space-y-6">
      {" "}
      {/* Wheels Card */}{" "}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
        {" "}
        <div className="flex justify-between items-center mb-4">
          {" "}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {" "}
            🎡 Picker Wheels{" "}
          </h2>{" "}
          <CreateWheelButton type={type} contentId={contentId} />{" "}
        </div>{" "}
        {taggedWheels.length > 0 ? (
          <div className="space-y-4">
            {" "}
            {taggedWheels.map((wheel) => (
              <a
                key={wheel._id}
                href={`/uwheels/${wheel._id}`}
                className="block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition p-4 rounded"
              >
                {" "}
                <h3 className="text-md font-semibold">{wheel.title}</h3>{" "}
                {wheel.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {" "}
                    {wheel.description}{" "}
                  </p>
                )}{" "}
              </a>
            ))}{" "}
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 p-4 rounded border border-yellow-300 dark:border-yellow-700">
            {" "}
            <p className="text-sm">
              {" "}
              No wheels found yet for this {type}. Be the first to create one
              and spark the conversation!{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Reviews Card */}{" "}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
        {" "}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {" "}
          ✍️ Reviews{" "}
        </h2>{" "}
        <ReviewsPanel
          type={type}
          contentId={pageId}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
        />{" "}
      </div>{" "}
      {/* Q&A Card */}{" "}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
        {" "}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {" "}
          ❓ Q&amp;A{" "}
        </h2>{" "}
        <QuestionsPanel
          type={type}
          contentId={pageId}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
          currentUserId={currentUserId}
        />{" "}
      </div>{" "}
    </section>
  );
}
