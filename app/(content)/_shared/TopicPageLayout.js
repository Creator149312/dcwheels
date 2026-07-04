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
import TrailerPlayer from "@app/(content)/[type]/TrailerPlayer";
import WorthItVote from "@components/WorthItVote";
import EntityTrackingBar from "@components/EntityTrackingBar";
import DoneNudge from "@components/DoneNudge";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";
import CreatePostTeaser from "@components/CreatePostTeaser";
import CharacterCarousel from "@components/CharacterCarousel";
import ExpandableDescription from "@components/ExpandableDescription";
import TopicCreateFAB from "@components/TopicCreateFAB";

const AdaptiveLeaderBoardAds = dynamic(
  () => import("@components/ads/AdaptiveLeaderBoardAds"),
  { ssr: false }
);
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), {
  ssr: false,
});

/** Streaming / affiliate provider row — used in both mobile and desktop hero. */
function StreamingLinks({ type, streaming, affiliateLinks }) {
  if (!streaming?.length && !affiliateLinks?.length) return null;
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {type === "game" ? "Available On" : "Where to Watch"}
      </p>
      <div className="flex flex-wrap gap-2">
        {streaming.map((provider, i) => (
          <a
            key={i}
            href={provider.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-muted hover:bg-accent text-foreground text-xs font-medium rounded-full px-3 py-1.5 transition-colors"
          >
            {(provider.logo_path || provider.store?.domain) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  provider.logo_path
                    ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                    : `https://www.google.com/s2/favicons?domain=${provider.store.domain}&sz=32`
                }
                alt=""
                className="w-4 h-4 rounded-sm flex-shrink-0"
              />
            )}
            {provider.provider_name ||
              provider.site ||
              provider.store?.name ||
              provider.url}
          </a>
        ))}
        {affiliateLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium rounded-full px-3 py-1.5 transition-colors border border-amber-200 dark:border-amber-800/40"
          >
            {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}

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
}) {
  const streaming = extras?.streaming ?? [];

  const totalVotes =
    (pageDoc.worthIt?.yes ?? 0) +
    (pageDoc.worthIt?.no ?? 0) +
    (pageDoc.worthIt?.meh ?? 0);
  // Consensus percent ignores 'meh' for the recommendation signal
  const consensusVotes = (pageDoc.worthIt?.yes ?? 0) + (pageDoc.worthIt?.no ?? 0);
  const worthItPercent =
    consensusVotes > 0 ? Math.round((pageDoc.worthIt.yes / consensusVotes) * 100) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Mobile hero (< sm) ────────────────────────────────────────────── */}
      <div className="sm:hidden px-2 pt-6 pb-6">

        {/* Row 1: poster + title / CTA */}
        <div className="flex gap-4 items-start">
          {pageDoc.cover && (
            <Image
              src={pageDoc.cover}
              alt={displayTitle}
              width={120}
              height={160}
              priority
              sizes="120px"
              className="w-[120px] flex-shrink-0 rounded-xl shadow-lg aspect-[3/4] object-cover"
            />
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
        <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <WorthItVote
            topicPageId={String(pageDoc._id)}
            type={type}
            initialWorthIt={pageDoc.worthIt}
            initialRating={pageDoc.rating}
          />
        </div>

        {/* Row 4: Worth It? vote */}
        <div className="mt-5">
          <DoneNudge entityId={String(pageDoc._id)} />
        </div>

        {/* Row 5: streaming + affiliate links */}
        <StreamingLinks
          type={type}
          streaming={streaming}
          affiliateLinks={affiliateLinks}
        />
      </div>

      {/* ── Desktop hero (sm+) - 12 Column Grid Layout ─────────────────── */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 pt-4 pb-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Left: Poster - 3 columns */}
          {pageDoc.cover && (
            <div className="col-span-3">
              <Image
                src={pageDoc.cover}
                alt={displayTitle}
                width={208}
                height={277}
                priority
                sizes="208px"
                className="w-full rounded-xl shadow-lg aspect-[3/4] object-cover"
              />
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
            <WorthItVote
              topicPageId={String(pageDoc._id)}
              type={type}
              initialWorthIt={pageDoc.worthIt}
              initialRating={pageDoc.rating}
            />
          </div>

          {/* Right: Where to Watch + You Might Also Like - 3 columns */}
          <div className="col-span-3 space-y-6">
            {/* Where to Watch / Available On */}
            {(streaming?.length > 0 || affiliateLinks?.length > 0) && (
              <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">
                    {type === "game" ? "Available on" : "Where to watch"}
                  </p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 text-muted-foreground"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                {/* Provider List - Vertical Stack for better visibility */}
                <div className="space-y-4">
                  {/* Main featured provider */}
                  {(streaming[0] || affiliateLinks[0]) && (
                    <a
                      href={(streaming[0]?.url || affiliateLinks[0]?.url) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full group"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        {streaming[0]?.logo_path || streaming[0]?.store?.domain ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              streaming[0]?.logo_path
                                ? `https://image.tmdb.org/t/p/w92${streaming[0].logo_path}`
                                : `https://www.google.com/s2/favicons?domain=${streaming[0]?.store?.domain}&sz=64`
                            }
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">🎬</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-border/40 pb-2">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {streaming[0]?.provider_name ||
                            streaming[0]?.site ||
                            streaming[0]?.store?.name ||
                            affiliateLinks[0]?.name ||
                            "Watch Now"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {affiliateLinks[0] ? "Sponsored" : "Stream Now"}
                        </p>
                      </div>
                    </a>
                  )}

                  {/* All other providers as a clean grid of icons */}
                  {(streaming.length + affiliateLinks.length > 1) && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 pl-1">
                        Also available on:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {/* Combine remaining streaming and affiliate links */}
                        {[...streaming.slice(1), ...affiliateLinks.slice(streaming[0] ? 0 : 1)].map((provider, i) => (
                          <a
                            key={i}
                            href={provider.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-lg bg-muted border border-border/40 flex items-center justify-center overflow-hidden hover:bg-accent hover:border-primary/30 transition-all group"
                            title={provider.provider_name || provider.site || provider.store?.name || provider.name}
                          >
                            {(provider.logo_path || provider.store?.domain) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  provider.logo_path
                                    ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                                    : `https://www.google.com/s2/favicons?domain=${provider.store?.domain || provider.url}&sz=32`
                                }
                                alt=""
                                className="w-6 h-6 rounded-md object-cover group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <span className="text-xs">🎬</span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
        {/* Unified Head Row: Spans on both Desktop and Mobile */}
        <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4 gap-4">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-primary inline-block" aria-hidden="true" />
            Community Discussion
          </h2>
        </div>

        {/* ── Characters & Cast Carousel ──────────────────────────────────── */}
        {animeCharacters?.length > 0 && (
          <div className="mb-10 px-0 sm:px-0">
            <CharacterCarousel characters={animeCharacters} />
          </div>
        )}

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
            <InfiniteFeedStream
              initialItems={initialFeed}
              type={type}
              externalId={relatedId}
              tag={tag}
              relatedPages={relatedPages}
              initialNextCursor={initialCursor}
              currentContextId={relatedId}
            />
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
