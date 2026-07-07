/**
 * app/(content)/_shared/TopicPageLayout.js
 *
 * Server component — shared JSX template used by all type-specific pages
 * (movie, anime, game, character). Receives fully-resolved data as props,
 * does no data-fetching of its own.
 *
 * Ads are dynamic({ ssr: false }) so empty <ins> elements are never included
 * in SSR HTML, preventing CLS when AdSense expands the slots on hydration.
 */

import dynamic from "next/dynamic";
import Image from "next/image";
import { Suspense } from "react";
import TrailerPlayer from "@app/(content)/[type]/TrailerPlayer";
import WorthItVote from "@components/WorthItVote";
import EntityTrackingBar from "@components/EntityTrackingBar";
import DoneNudge from "@components/DoneNudge";
import CreatePostTeaser from "@components/CreatePostTeaser";
import ExpandableDescription from "@components/ExpandableDescription";
import TopicCreateFAB from "@components/TopicCreateFAB";

import {
  SuspendedTrailer,
  SuspendedStreamingMobile,
  SuspendedStreamingDesktop,
  SuspendedCharacters,
  SuspendedFeedStream,
  TrailerSkeleton,
  StreamingSkeletonMobile,
  StreamingSkeletonDesktop,
  CharactersSkeleton,
  FeedSkeleton,
} from "./SuspendedSections";


const AdaptiveLeaderBoardAds = dynamic(
  () => import("@components/ads/AdaptiveLeaderBoardAds"),
  { ssr: false }
);
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), {
  ssr: false,
});

/** Horizontally scrollable meta pills (year, episodes/runtime/platform, tags). */
function MetaPills({ type, pageDoc }) {
  return (
    <div
      className="flex gap-2 mt-4 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {pageDoc.details?.releaseYear && (
        <span className="flex-shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-3 py-1">
          {pageDoc.details.releaseYear}
        </span>
      )}
      {type === "anime" && pageDoc.details?.episodes && (
        <span className="flex-shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-3 py-1">
          {pageDoc.details.episodes} eps
        </span>
      )}
      {type === "movie" && pageDoc.details?.runtime && (
        <span className="flex-shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-3 py-1">
          {pageDoc.details.runtime} min
        </span>
      )}
      {type === "game" && pageDoc.details?.platform && (
        <span className="flex-shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-3 py-1 max-w-[180px] truncate">
          {pageDoc.details.platform.split(",")[0].trim()}
        </span>
      )}
      {pageDoc.tags?.slice(0, 5).map((tag) => (
        <span
          key={tag}
          className="flex-shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-3 py-1 capitalize"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export default async function TopicPageLayout({
  type,
  pageDoc,
  extras,
  relatedPages,
  taggedWheels,
  animeCharacters,
  displayTitle,
  affiliateLinks,
  relatedId,
  initialFeed = [],
  initialCursor = null,
  tag = null,
  extrasPromise,
  relatedPagesPromise,
  charactersPromise,
  feedPromise,
}) {
  // Wrap existing raw objects or promises into Promises to maintain 100% compatibility
  const finalExtrasPromise = extrasPromise || Promise.resolve(extras || { trailerKey: null, streaming: [] });
  const finalCharactersPromise = charactersPromise || Promise.resolve(animeCharacters || []);
  const finalRelatedPagesPromise = relatedPagesPromise || Promise.resolve(relatedPages || []);
  const finalFeedPromise = feedPromise || Promise.resolve(initialFeed || []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Mobile hero (< sm) ────────────────────────────────────────────── */}
      <div className="sm:hidden px-2 pt-6 pb-6">

        {/* Row 1: poster + title / CTA */}
        <div className="flex gap-4 items-start">
          {pageDoc.cover && (
            <div className="flex flex-col gap-2 w-[120px] flex-shrink-0">
              <Image
                src={pageDoc.cover}
                alt={displayTitle}
                width={120}
                height={160}
                priority
                sizes="120px"
                className="w-full rounded-xl shadow-lg aspect-[3/4] object-cover"
              />
              <Suspense fallback={<TrailerSkeleton />}>
                <SuspendedTrailer extrasPromise={finalExtrasPromise} type={type} displayTitle={displayTitle} />
              </Suspense>
            </div>
          )}
          <div className="flex flex-col gap-3 min-w-0 pt-1">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-bold leading-tight text-foreground">
                {displayTitle}
              </h1>
            </div>
            <EntityTrackingBar
              type={type}
              entityId={String(pageDoc._id)}
              name={displayTitle}
              slug={pageDoc.slug}
              image={pageDoc.cover}
            />
          </div>
        </div>

        {/* Row 2: meta pills */}
        <MetaPills type={type} pageDoc={pageDoc} />

        {/* Row 3: description */}
        <ExpandableDescription description={pageDoc.description} />

        {/* Row 4: Worth It Vote */}
        {type !== "character" && (
          <div className="mt-3.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/30 border border-border/50">
            <WorthItVote
              topicPageId={String(pageDoc._id)}
              type={type}
              initialWorthIt={pageDoc.worthIt}
              initialRating={pageDoc.rating}
            />
          </div>
        )}

        {/* Row 4: Status Update */}
        <div className="mt-5">
          <DoneNudge entityId={String(pageDoc._id)} />
        </div>

        {/* Row 5: streaming + affiliate links */}
        <Suspense fallback={<StreamingSkeletonMobile />}>
          <SuspendedStreamingMobile
            extrasPromise={finalExtrasPromise}
            affiliateLinks={affiliateLinks}
            type={type}
          />
        </Suspense>
      </div>

      {/* ── Desktop hero (sm+) - 12 Column Grid Layout ─────────────────── */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 pt-4 pb-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Left: Poster - 3 columns */}
          {pageDoc.cover && (
            <div className="col-span-3 flex flex-col gap-3">
              <Image
                src={pageDoc.cover}
                alt={displayTitle}
                width={208}
                height={277}
                priority
                sizes="208px"
                className="w-full rounded-xl shadow-lg aspect-[3/4] object-cover"
              />
              <Suspense fallback={<TrailerSkeleton />}>
                <SuspendedTrailer extrasPromise={finalExtrasPromise} type={type} displayTitle={displayTitle} />
              </Suspense>
            </div>
          )}

          {/* Center: Info column - 6 columns */}
          <div className="col-span-6">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-3xl font-bold leading-tight text-foreground">
                {displayTitle}
              </h1>
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <EntityTrackingBar
                type={type}
                entityId={String(pageDoc._id)}
                name={displayTitle}
                slug={pageDoc.slug}
                image={pageDoc.cover}
              />
            </div>

            <MetaPills type={type} pageDoc={pageDoc} />

            <ExpandableDescription description={pageDoc.description} />

            <DoneNudge entityId={String(pageDoc._id)} />
            
            {type !== "character" && (
              <WorthItVote
                topicPageId={String(pageDoc._id)}
                type={type}
                initialWorthIt={pageDoc.worthIt}
                initialRating={pageDoc.rating}
              />
            )}
          </div>

          {/* Right: Where to Watch + You Might Also Like - 3 columns */}
          <div className="col-span-3">
            <Suspense fallback={<StreamingSkeletonDesktop />}>
              <SuspendedStreamingDesktop
                extrasPromise={finalExtrasPromise}
                affiliateLinks={affiliateLinks}
                type={type}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* ── Leaderboard ad ──────────────────────────────────────────────── */}
      {/* Commented out for cleaner layout */}
      {/* <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4">
        <AdaptiveLeaderBoardAds
          desktopSlot="2668822790"
          mobileSlot="8451962089"
        />
      </div> */}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6">
        {/* ── Characters & Cast Carousel ──────────────────────────────────── */}
        <div className="mb-10">
          <Suspense fallback={<CharactersSkeleton />}>
            <SuspendedCharacters charactersPromise={finalCharactersPromise} />
          </Suspense>
        </div>

        {/* Unified Head Row: Spans on both Desktop and Mobile */}
        <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4 gap-4">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-primary inline-block" aria-hidden="true" />
            Community Discussion
          </h2>
        </div>

        {/* Centered Single-Column Feed */}
        <div className="flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            <CreatePostTeaser
              defaultTag={displayTitle}
              className="mb-6"
              contentRef={
                relatedId
                  ? {
                      type,
                      externalId: String(relatedId),
                      slug: pageDoc.slug,
                      title: displayTitle,
                      image: pageDoc.cover || null,
                    }
                  : null
              }
            />

            <Suspense fallback={<FeedSkeleton />}>
              <SuspendedFeedStream
                feedPromise={finalFeedPromise}
                relatedPagesPromise={finalRelatedPagesPromise}
                type={type}
                relatedId={relatedId}
                tag={tag}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Bottom-of-page ad - Commented out for cleaner layout */}
      {/* <div className="min-h-[90px]">
        <AdsUnit slot="9397002286" />
      </div> */}

      {/* Floating Create Button - Commented out in favor of inline button in Community Discussion */}
      {/* <TopicCreateFAB
        tag={pageDoc.slug.replace(/^\d+-/, "")}
        tagDisplay={displayTitle}
        contentRef={relatedId ? { type, externalId: String(relatedId), slug: pageDoc.slug, title: displayTitle, image: pageDoc.cover || null } : null}
      /> */}
    </div>
  );
}
