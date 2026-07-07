/**
 * app/(content)/_shared/SuspendedSections.js
 *
 * Async Server Components for streaming/lazy-loading the slow parts of Topic Pages.
 * They take Promises started in the parent page files and await them on the server.
 */

import { Suspense } from "react";
import Image from "next/image";
import TrailerButton from "@components/TrailerButton";
import CharacterCarousel from "@components/CharacterCarousel";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

// ── SKELETONS (FALLBACKS) ────────────────────────────────────────────────────

export function TrailerSkeleton() {
  return <div className="w-full h-10 bg-muted/60 animate-pulse rounded-xl" />;
}

export function StreamingSkeletonMobile() {
  return (
    <div className="mt-5">
      <div className="h-3 w-24 bg-muted/60 animate-pulse rounded mb-3" />
      <div className="flex gap-2 flex-wrap">
        <div className="w-24 h-8 bg-muted/60 animate-pulse rounded-full" />
        <div className="w-28 h-8 bg-muted/60 animate-pulse rounded-full" />
        <div className="w-20 h-8 bg-muted/60 animate-pulse rounded-full" />
      </div>
    </div>
  );
}

export function StreamingSkeletonDesktop() {
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/40 space-y-3">
      <div className="h-4 w-28 bg-muted/60 animate-pulse rounded" />
      <div className="space-y-1.5 mt-2">
        <div className="h-10 w-full bg-muted/60 animate-pulse rounded-lg" />
        <div className="h-10 w-full bg-muted/60 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

export function CharactersSkeleton() {
  return (
    <div className="mb-10">
      <div className="h-5 w-36 bg-muted/60 animate-pulse rounded mb-4" />
      <div className="flex gap-4 overflow-x-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[70px]">
            <div className="w-14 h-14 bg-muted/60 animate-pulse rounded-full" />
            <div className="h-3 w-12 bg-muted/60 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-3xl">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted/60 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 bg-muted/60 animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted/60 animate-pulse rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full bg-muted/60 animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-muted/60 animate-pulse rounded" />
          </div>
          <div className="h-36 w-full bg-muted/50 animate-pulse rounded-xl" />
          <div className="flex justify-between items-center pt-2">
            <div className="h-4 w-16 bg-muted/60 animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted/60 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ASYNC LOADERS ────────────────────────────────────────────────────────────

/** Renders streaming/affiliate links inside both mobile and desktop views */
function InnerStreamingAndAffiliate({ type, streaming, affiliateLinks, styleType = "mobile" }) {
  if (!streaming?.length && !affiliateLinks?.length) return null;

  if (styleType === "mobile") {
    return (
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {type === "game" ? "Available On" : "Where to Watch"}
        </p>
        <div className="flex flex-wrap gap-2">
          {streaming.map((provider, i) => {
            const providerName = provider.provider_name || provider.site || provider.store?.name || provider.url;
            return (
              <a
                key={i}
                href={provider.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-secondary/80 dark:bg-[#131927]/60 hover:bg-secondary border border-border/80 text-foreground text-xs font-semibold rounded-full px-3.5 py-1.5 transition duration-200 shadow-sm active:scale-95"
              >
                {(provider.logo_path || provider.store?.domain) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      provider.logo_path
                        ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                        : `https://www.google.com/s2/favicons?domain=${provider.store.domain}&sz=32`
                    }
                    alt=""
                    className="w-4 h-4 rounded-sm flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded bg-foreground/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    🎬
                  </div>
                )}
                <span className="truncate">{providerName}</span>
              </a>
            );
          })}
          {affiliateLinks.map((link) => {
            let domain = "amazon.com";
            try {
              domain = new URL(link.url).hostname;
            } catch (e) {}
            return (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full px-3.5 py-1.5 transition duration-200 shadow-sm active:scale-95"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm flex-shrink-0 object-cover"
                />
                <span className="truncate">{link.name}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Style (Vertical Stack inside cards)
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
      <div className="flex items-center justify-between mb-2">
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

      <div className="space-y-1">
        {streaming.map((provider, i) => (
          <a
            key={`stream-${i}`}
            href={provider.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 w-full p-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {provider.logo_path || provider.store?.domain ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    provider.logo_path
                      ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                      : `https://www.google.com/s2/favicons?domain=${provider.store.domain}&sz=32`
                  }
                  alt=""
                  className="w-6 h-6 rounded object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <span className="text-sm">🎬</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {provider.provider_name || provider.site || provider.store?.name || provider.url}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
                Stream Now
              </p>
            </div>
          </a>
        ))}

        {affiliateLinks.map((link) => {
          let domain = "amazon.com";
          try {
            domain = new URL(link.url).hostname;
          } catch (e) {}
          return (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full p-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-all group"
            >
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt=""
                  className="w-6 h-6 rounded object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {link.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
                  Store Page
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export async function SuspendedTrailer({ extrasPromise, type, displayTitle }) {
  if (type === "character") return null;
  const extras = await extrasPromise;
  const trailerKey = extras?.trailerKey ?? null;
  if (!trailerKey) return null;
  return <TrailerButton trailerKey={trailerKey} title={displayTitle} />;
}

export async function SuspendedStreamingMobile({ extrasPromise, affiliateLinks, type }) {
  const extras = await extrasPromise;
  const streaming = extras?.streaming ?? [];
  return (
    <InnerStreamingAndAffiliate
      type={type}
      streaming={streaming}
      affiliateLinks={affiliateLinks}
      styleType="mobile"
    />
  );
}

export async function SuspendedStreamingDesktop({ extrasPromise, affiliateLinks, type }) {
  const extras = await extrasPromise;
  const streaming = extras?.streaming ?? [];
  return (
    <InnerStreamingAndAffiliate
      type={type}
      streaming={streaming}
      affiliateLinks={affiliateLinks}
      styleType="desktop"
    />
  );
}

export async function SuspendedCharacters({ charactersPromise }) {
  const characters = await charactersPromise;
  if (!characters || characters.length === 0) return null;
  return (
    <div className="mb-10 px-0 sm:px-0">
      <CharacterCarousel characters={characters} />
    </div>
  );
}

export async function SuspendedFeedStream({
  feedPromise,
  relatedPagesPromise,
  type,
  relatedId,
  tag,
}) {
  const [feedData, relatedPages] = await Promise.all([
    feedPromise,
    relatedPagesPromise,
  ]);

  const initialFeed = feedData ? feedData.slice(0, 8) : [];
  const initialCursor = feedData && feedData.length > 8 ? feedData[7].createdAt : null;

  return (
    <InfiniteFeedStream
      initialItems={JSON.parse(JSON.stringify(initialFeed))}
      type={type}
      externalId={relatedId}
      tag={tag}
      relatedPages={JSON.parse(JSON.stringify(relatedPages))}
      initialNextCursor={initialCursor ? JSON.parse(JSON.stringify(initialCursor)) : null}
      currentContextId={relatedId}
    />
  );
}
