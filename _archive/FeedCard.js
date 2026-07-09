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
      <div className="hidden sm:flex absolute left-4 top-1.5 -ml-[5px] h-3 w-3 rounded-full border-2 border-primary bg-background" />

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors hover:border-primary/30">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <p className="text-foreground leading-relaxed text-sm sm:text-base">
            <span className="font-semibold text-primary">
              {user.name}
            </span>
            {" "}{actionText}{" "}
            {entity && (
              <Link 
                href={entity.route} 
                className="font-medium text-muted-foreground hover:text-primary hover:underline transition-colors block sm:inline mt-1 sm:mt-0"
              >
                {entity.title}
              </Link>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {createdAt && (
              <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-full tabular-nums">
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
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          {footerLink ? (
            <Link
              href={footerLink.route}
              className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
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