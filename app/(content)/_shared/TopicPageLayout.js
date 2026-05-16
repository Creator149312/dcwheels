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
import TopicInteractionTabs from "@app/(content)/[type]/TopicInteractionTabs";
import TrailerPlayer from "@app/(content)/[type]/TrailerPlayer";
import WorthItVote from "@components/WorthItVote";
import AddToListButton from "@components/AddToListButton";
import SpinHistoryBadge from "@components/SpinHistoryBadge";
import DoneNudge from "@components/DoneNudge";

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

export default function TopicPageLayout({
  type,
  pageDoc,
  extras,
  relatedPages,
  taggedWheels,
  animeCharacters,
  displayTitle,
  affiliateLinks,
  relatedId,
}) {
  const streaming = extras?.streaming ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Mobile hero (< sm) ────────────────────────────────────────────── */}
      <div className="sm:hidden px-4 pt-6 pb-6">

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
            <h1 className="text-xl font-bold leading-tight text-foreground">
              {displayTitle}
            </h1>
            <AddToListButton
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
        <p className="text-sm text-muted-foreground leading-relaxed mt-4 line-clamp-3">
          {pageDoc.description}
        </p>

        {/* Row 4: Worth It? vote */}
        <div className="mt-5">
          <DoneNudge entityId={String(pageDoc._id)} />
          <WorthItVote
            topicPageId={String(pageDoc._id)}
            type={type}
            initialYes={pageDoc.worthIt?.yes ?? 0}
            initialNo={pageDoc.worthIt?.no ?? 0}
          />
        </div>

        {/* Row 5: streaming + affiliate links */}
        <StreamingLinks
          type={type}
          streaming={streaming}
          affiliateLinks={affiliateLinks}
        />
      </div>

      {/* ── Desktop hero (sm+) ───────────────────────────────────────────── */}
      <div className="hidden sm:block max-w-5xl mx-auto px-6 pt-10 pb-12">
        <div className="flex gap-10 items-start">

          {/* Poster */}
          {pageDoc.cover && (
            <Image
              src={pageDoc.cover}
              alt={displayTitle}
              width={208}
              height={277}
              priority
              sizes="208px"
              className="w-52 flex-shrink-0 rounded-xl shadow-lg aspect-[3/4] object-cover"
            />
          )}

          {/* Info column */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold leading-tight text-foreground mb-4">
              {displayTitle}
            </h1>

            <AddToListButton
              type={type}
              entityId={String(pageDoc._id)}
              name={displayTitle}
              slug={pageDoc.slug}
              image={pageDoc.cover}
            />

            <MetaPills type={type} pageDoc={pageDoc} />

            <p className="text-sm text-muted-foreground leading-relaxed mt-4 mb-5">
              {pageDoc.description}
            </p>

            <DoneNudge entityId={String(pageDoc._id)} />
            <WorthItVote
              topicPageId={String(pageDoc._id)}
              type={type}
              initialYes={pageDoc.worthIt?.yes ?? 0}
              initialNo={pageDoc.worthIt?.no ?? 0}
            />

            <StreamingLinks
              type={type}
              streaming={streaming}
              affiliateLinks={affiliateLinks}
            />
          </div>
        </div>
      </div>

      {/* ── Leaderboard ad ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <AdaptiveLeaderBoardAds
          desktopSlot="2668822790"
          mobileSlot="8451962089"
        />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        <SpinHistoryBadge result={displayTitle} />

        {extras?.trailerKey && (
          <section>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary inline-block" aria-hidden="true" />
              Trailer
            </h2>
            <TrailerPlayer trailerKey={extras.trailerKey} title={displayTitle} />
          </section>
        )}

        <TopicInteractionTabs
          type={type}
          pageId={pageDoc._id}
          contentId={String(relatedId)}
          contentSlug={pageDoc.slug}
          contentTitle={displayTitle}
          contentCover={pageDoc.cover || null}
          contentTags={pageDoc.tags || []}
          taggedWheels={taggedWheels}
          animeCharacters={type === "anime" ? animeCharacters : []}
          entityId={String(relatedId)}
        />

        {relatedPages?.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary inline-block" aria-hidden="true" />
              You Might Also Like
            </h2>
            <div
              className="flex overflow-x-auto gap-4 pb-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {relatedPages.map((related) => {
                const relatedTitle =
                  related.title?.default ||
                  related.title?.english ||
                  related.title?.romaji ||
                  related.title?.localized ||
                  related.title?.original ||
                  "Untitled";
                return (
                  <a
                    key={String(related._id)}
                    href={`/${related.type}/${related.slug}`}
                    className="group flex-shrink-0 w-28 sm:w-32 block"
                  >
                    <div className="rounded-xl overflow-hidden bg-muted mb-2 aspect-[3/4] group-hover:scale-105 transition-transform duration-200">
                      {related.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={related.cover}
                          alt={relatedTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                      {relatedTitle}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {related.type}
                    </p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

      </div>

      {/* Bottom-of-page ad */}
      <div className="min-h-[90px]">
        <AdsUnit slot="9397002286" />
      </div>
    </div>
  );
}
