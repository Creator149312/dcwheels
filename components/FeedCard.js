"use client";

import Link from "next/link";
import { timeAgo } from "@utils/HelperFunctions";
import FollowButton from "@components/FollowButton";
import ReactionButton from "@components/ReactionButton";

export default function FeedCard({ 
  user, 
  actionText, 
  entity, 
  createdAt,
  children,
  footerLink, 
  reaction,
  isLoggedIn,
  openLoginPrompt,
}) {

  return (
    <div className="relative sm:pl-10">
      {/* Timeline dot */}
      <div className="hidden sm:flex absolute left-4 top-1.5 -ml-[5px] h-3 w-3 rounded-full border-2 border-blue-500 bg-white dark:bg-[#1f1f1f] shadow-sm shadow-blue-500/20" />

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1f1f1f] p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm sm:text-base">
            <Link 
              href={`/profile/${user.slug}`} 
              className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {user.name}
            </Link>
            {" "}{actionText}{" "}
            {entity && (
              <Link 
                href={entity.route} 
                className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:underline transition-colors block sm:inline mt-1 sm:mt-0"
              >
                {entity.title}
              </Link>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {createdAt && (
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-full tabular-nums">
                {timeAgo(createdAt)}
              </span>
            )}
            {user.id && user.name !== "Someone" && (
              <FollowButton
                entityType="user"
                entityId={user.id}
                openLoginPrompt={openLoginPrompt}
                labelFollow="Follow"
                labelFollowing="Following"
                className="text-xs px-2.5 py-1"
              />
            )}
          </div>
        </div>

        {/* Content */}
        {children}

        {/* Footer — only render if there's something to show */}
        {(footerLink || reaction) && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/60 pt-3">
          {footerLink ? (
            <Link
              href={footerLink.route}
              className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              {footerLink.text} <span className="ml-1 text-lg leading-none">&rarr;</span>
            </Link>
          ) : <div />}

          {reaction && (
            <ReactionButton
              entityType={reaction.entityType}
              entityId={reaction.entityId}
              reactionType={reaction.reactionType || "like"}
              initialCount={reaction.initialCount || 0}
              reactedByCurrentUser={reaction.reactedByCurrentUser || false}
              isLoggedIn={isLoggedIn}
              openLoginPrompt={openLoginPrompt}
            />
          )}
        </div>
        )}
      </div>
    </div>
  );
}