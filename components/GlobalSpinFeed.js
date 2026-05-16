"use client";

/**
 * GlobalSpinFeed â€” public global activity feed (Surface C).
 *
 * Renders the most recent public saved decisions across the entire platform.
 */

import { Activity, Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import FeedCard from "@components/FeedCard";
import AskCard from "@components/AskCard";

// Inject one Ask teaser every N spin cards
const ASK_INJECT_INTERVAL = 5;

export default function GlobalSpinFeed({ stories: initialStories = [], askTeasers = [] }) {
  const [stories, setStories] = useState(initialStories);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(initialStories.length);
  const [hasMore, setHasMore] = useState(initialStories.length >= 50);
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const isLoggedIn = !!session?.user;

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const res = await fetch(`/api/feed/global?limit=50&skip=${skip}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.stories?.length) {
          setStories((prev) => [...prev, ...data.stories]);
          setSkip((prev) => prev + data.stories.length);
          if (data.stories.length < 50) {
            setHasMore(false);
          }
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Failed to load more stories:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!stories || stories.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-12 text-center text-muted-foreground mt-6">
        <Activity className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-50" />
        <p className="text-lg font-medium text-foreground">It&apos;s quiet... too quiet.</p>
        <p className="text-sm mt-2 max-w-sm mx-auto">
          No public spin stories found just yet. Spin some wheels and save the results publicly to kick off the feed!
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 mt-6 max-w-3xl mx-auto">
      {/* 
        Timeline vertical line 
        Slightly inset from left on desktop, hugs left on mobile 
      */}
      <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-border to-transparent hidden sm:block"></div>

      {stories.map((story, index) => {
        const wheelRoute = story.wheelId?.length === 24 
          ? `/uwheels/${story.wheelId}` 
          : `/wheels/${story.wheelId}`;

        // After every ASK_INJECT_INTERVAL spin cards, inject an Ask teaser
        const shouldInjectAsk = askTeasers.length > 0 && index > 0 && index % ASK_INJECT_INTERVAL === ASK_INJECT_INTERVAL - 1;
        const teaserAsk = shouldInjectAsk ? askTeasers[Math.floor(index / ASK_INJECT_INTERVAL) % askTeasers.length] : null;

        return (
          <div key={story.id}>
            <FeedCard
              user={{ id: story.userId, name: story.userName, slug: story.userSlug }}
              actionText="spun"
              entity={{ title: story.wheelTitle, route: wheelRoute }}
              createdAt={story.createdAt}
              footerLink={{ text: "Spin this wheel", route: wheelRoute }}
              isLoggedIn={isLoggedIn}
              openLoginPrompt={openLoginPrompt}
              reaction={{ 
                entityType: "decisionLog", 
                entityId: story.id, 
                initialCount: story.likeCount, 
                reactedByCurrentUser: false 
              }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Got:</span>
                  <span className="font-bold text-amber-900 dark:text-amber-100 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-md shadow-sm text-lg">
                    {story.result}
                  </span>
                </div>

                {story.resultImage && (
                  <Link 
                    href={wheelRoute}
                    className="group mt-2 w-full h-48 sm:h-64 relative rounded-xl border border-border bg-muted/30 block overflow-hidden"
                  >
                    <Image 
                      src={story.resultImage} 
                      alt={story.result || "Segment result"} 
                      fill 
                      className="object-contain group-hover:scale-105 transition-transform duration-300" 
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0">
                        <span className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold px-6 py-2.5 rounded-full flex items-center gap-2 pointer-events-auto">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Spin This Wheel!
                        </span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {story.note && (
                <div className="mt-4 text-sm text-muted-foreground border-l-[3px] border-primary/30 pl-3 py-1 bg-muted/30 rounded-r-md italic">
                  &quot;{story.note}&quot;
                </div>
              )}
            </FeedCard>

            {/* Ask teaser injected after every 5th spin card */}
            {teaserAsk && (
              <div className="relative sm:pl-10 mt-6">
                <div className="hidden sm:flex absolute left-4 top-1.5 -ml-[5px] h-3 w-3 rounded-full border-2 border-purple-500 bg-background" />
                <AskCard ask={teaserAsk} compact />
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-8 pb-12 relative z-10">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors
              bg-card text-foreground border border-border hover:bg-muted
              focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              "Load Older Activity"
            )}
          </button>
        </div>
      )}
    </div>
  );
}