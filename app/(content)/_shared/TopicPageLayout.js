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

import Image from "next/image";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import WorthItVote from "@components/WorthItVote";
import EntityTrackingBar from "@components/EntityTrackingBar";
import DoneNudge from "@components/DoneNudge";
import CreatePostTeaser from "@components/CreatePostTeaser";
import ExpandableDescription from "@components/ExpandableDescription";

const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), { ssr: false });

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

/** Horizontally scrollable meta pills (episodes/platform). */
function MetaPills({ type, pageDoc }) {
  return (
    <div
      className="flex gap-1.5 mt-1.5 overflow-x-auto pb-0 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {type === "anime" && pageDoc.details?.episodes && (
        <span className="flex-shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
          {pageDoc.details.episodes} eps
        </span>
      )}
      {type === "game" && pageDoc.details?.platform && (
        <span className="flex-shrink-0 text-xs font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 max-w-[180px] truncate">
          {pageDoc.details.platform.split(",")[0].trim()}
        </span>
      )}
    </div>
  );
}

export default async function TopicPageLayout({
  type,
  pageDoc,
  extras,
  relatedPages,
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
  // Wrap existing raw objects or promises into Promises to maintain compatibility.
  // A null promise means the section is intentionally omitted for this content type.
  const finalExtrasPromise = extrasPromise ?? Promise.resolve(extras || { trailerKey: null, streaming: [] });
  const finalCharactersPromise = charactersPromise ?? Promise.resolve(animeCharacters || []);
  const finalRelatedPagesPromise = relatedPagesPromise || Promise.resolve(relatedPages || []);
  const finalFeedPromise = feedPromise || Promise.resolve(initialFeed || []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Mobile hero (< sm) ────────────────────────────────────────────── */}
      <div className="sm:hidden px-2 pt-1.5 pb-1.5 border-b border-border/40">

        {/* Row 1: poster + title / CTA */}
        <div className="flex gap-3 items-start">
          {pageDoc.cover && (
            <div className="flex flex-col gap-2 w-[110px] flex-shrink-0">
              <Image
                src={pageDoc.cover}
                alt={displayTitle}
                width={110}
                height={145}
                priority
                sizes="110px"
                className="w-full rounded-lg shadow-md aspect-[3/4] object-cover"
              />
              {finalExtrasPromise !== null && (
                <Suspense fallback={<TrailerSkeleton />}>
                  <SuspendedTrailer extrasPromise={finalExtrasPromise} type={type} displayTitle={displayTitle} />
                </Suspense>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold leading-tight text-foreground tracking-tight">
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

        {/* Row 3: description */}
        <ExpandableDescription description={pageDoc.description} />

        {/* Row 4: Worth It Vote */}
        {type !== "character" && (
          <WorthItVote
            topicPageId={String(pageDoc._id)}
            type={type}
            initialWorthIt={pageDoc.worthIt}
            initialRating={pageDoc.rating}
          />
        )}

        {/* Ad unit below WorthIt vote on mobile */}
        <div className="min-h-[100px] max-h-[100px] h-[100px] my-2 bg-muted/5 rounded-lg border-y border-border/40 overflow-hidden">
          <AdsUnit
            slot="4694567949"
            format="auto"
            minHeight={100}
            className="my-0 py-2 sm:my-0 sm:py-2 sm:rounded-none border-0"
          />
        </div>

        {/* Row 5: Status Update */}
        <div className="mt-2">
          <DoneNudge />
        </div>

        {/* Row 5: streaming + affiliate links */}
        {finalExtrasPromise !== null && (
          <Suspense fallback={<StreamingSkeletonMobile />}>
            <SuspendedStreamingMobile
              extrasPromise={finalExtrasPromise}
              affiliateLinks={affiliateLinks}
              type={type}
            />
          </Suspense>
        )}
      </div>

      {/* ── Desktop hero (sm+) - 12 Column Grid Layout ─────────────────── */}
      <div className="hidden sm:block max-w-7xl mx-auto px-2 pt-2 pb-2">
        <div className="grid grid-cols-12 gap-5">

          {/* Left: Poster - 3 columns */}
          {pageDoc.cover && (
            <div className="col-span-3 flex flex-col gap-2">
              <Image
                src={pageDoc.cover}
                alt={displayTitle}
                width={208}
                height={277}
                priority
                sizes="208px"
                className="w-full rounded-xl shadow-lg aspect-[3/4] object-cover"
              />
              {finalExtrasPromise !== null && (
                <Suspense fallback={<TrailerSkeleton />}>
                  <SuspendedTrailer extrasPromise={finalExtrasPromise} type={type} displayTitle={displayTitle} />
                </Suspense>
              )}
            </div>
          )}

          {/* Center: Info column - 6 columns */}
          <div className="col-span-6">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h1 className="text-3xl font-bold leading-tight text-foreground">
                {displayTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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

            <DoneNudge />
            
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
          {finalExtrasPromise !== null && (
            <div className="col-span-3">
              <Suspense fallback={<StreamingSkeletonDesktop />}>
                <SuspendedStreamingDesktop
                  extrasPromise={finalExtrasPromise}
                  affiliateLinks={affiliateLinks}
                  type={type}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-2 pt-2 sm:pt-4 pb-5">
        {/* ── Characters & Cast Carousel ──────────────────────────────────── */}
        {finalCharactersPromise !== null && (
          <Suspense fallback={<CharactersSkeleton />}>
            <SuspendedCharacters charactersPromise={finalCharactersPromise} />
          </Suspense>
        )}

        {/* Unified Head Row: Spans on both Desktop and Mobile */}
        <div className="flex items-center justify-between mt-1 mb-1 sm:mb-2 pb-1 sm:pb-2 gap-3 px-3 sm:px-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-primary inline-block" aria-hidden="true" />
            Community Verdict & Hot Takes
          </h2>
        </div>

        {/* Centered Single-Column Feed */}
        <div className="flex justify-center">
          <div className="w-full max-w-2xl space-y-5">
            <CreatePostTeaser
              defaultTag={displayTitle}
              className="mb-5"
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
                docType="post,wheel"
              />
            </Suspense>
          </div>
        </div>
      </div>

    </div>
  );
}
