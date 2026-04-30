"use client";

import { useState, Fragment, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import apiConfig from "@utils/ApiUrlConfig";
import AdsUnit from "./ads/AdsUnit";

// Number of grid cards visible above the fold on a typical mobile viewport
// (2 cols × ~2 rows). Their images get `priority` + fetchPriority="high" so
// the browser starts fetching the LCP image immediately instead of after
// React hydrates and the lazy IntersectionObserver kicks in.
const ABOVE_FOLD_COUNT = 4;

export default function TagWheelsGrid({ initialWheels, tagId }) {
  const [wheels, setWheels] = useState(initialWheels);
  const [skip, setSkip] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialWheels.length >= 20);
  // Default to "desktop" (false) instead of `null`. Picking a concrete value
  // avoids two issues:
  //   1. `adInterval = null` previously meant ZERO ads on first render, then
  //      a sudden insertion post-hydration → CLS.
  //   2. SSR + first paint disagreed about layout, breaking React's
  //      hydration consistency promise.
  // Mobile users get a corrected `adInterval` after `matchMedia` resolves,
  // but the wheel cards themselves don't move because ads only appear after
  // ~every 6th/10th card — well past the LCP fold.
  const [isMobile, setIsMobile] = useState(false);

  // Use matchMedia instead of `resize`: the latter fires on every URL bar
  // collapse on mobile (dozens of events per scroll). matchMedia only fires
  // when the breakpoint actually crosses.
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023.98px)");
    setIsMobile(mql.matches);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  async function loadMore() {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(
        `${apiConfig.apiUrl}/wheels-by-tag?tag=${encodeURIComponent(tagId)}&limit=20&skip=${skip}`,
      );
      const data = await res.json();
      const newWheels = data.wheels || [];

      if (newWheels.length > 0) {
        setWheels((prev) => [...prev, ...newWheels]);
        setSkip((prev) => prev + 20);
      }
      if (newWheels.length < 20) setHasMore(false);
    } catch (err) {
      console.error("Load more failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const adInterval = isMobile ? 6 : 10;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {wheels.map((wheel, index) => {
          const showAd = (index + 1) % adInterval === 0;
          // First N cards are above-the-fold LCP candidates: fetch eagerly
          // and tell the browser they're high priority. Rest stay lazy so we
          // don't blow the connection budget on off-screen images.
          const isAboveFold = index < ABOVE_FOLD_COUNT;

          return (
            <Fragment key={wheel._id || index}>
              <a
                href={`/uwheels/${wheel._id}`}
                className="group flex flex-col bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:border-blue-500 transition-all duration-300 active:scale-[0.98]"
              >
                <div className="relative aspect-[4/3] w-full bg-white dark:bg-gray-800 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 overflow-hidden">
                  {wheel.wheelPreview ? (
                    <Image
                      src={wheel.wheelPreview}
                      alt={wheel.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      priority={isAboveFold}
                      // `fetchPriority` reinforces `priority` for the actual
                      // network request — Next.js sets it implicitly for
                      // `priority` images, but being explicit is defensive
                      // and self-documenting.
                      fetchPriority={isAboveFold ? "high" : "auto"}
                      loading={isAboveFold ? "eager" : "lazy"}
                    />
                  ) : (
                    <span className="text-gray-200 dark:text-gray-700 text-5xl font-black group-hover:scale-110 transition-transform">
                      {wheel.title?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1">
                  <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {wheel.title}
                  </h3>
                </div>
              </a>

              {/* Responsive ad injection using col-span-full */}
              {showAd && (
                <div className="col-span-full my-4 md:my-6">
                  <div className="w-full py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center">
                    <AdsUnit slot={"4694567949"} />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center justify-center mt-12 mb-10">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>LOADING...</span>
              </>
            ) : (
              "LOAD MORE"
            )}
          </button>
        </div>
      )}
    </>
  );
}
