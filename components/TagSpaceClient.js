"use client";

import { useState, Fragment, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { TbBrandThreads, TbHelpCircle } from "react-icons/tb";
import apiConfig from "@utils/ApiUrlConfig";

// Split from the initial bundle — AskCard (voting/options logic) and AdsUnit
// (AdSense) are not needed for the above-the-fold render. Lazy-loading them
// reduces JS parse time and improves TBT on low-end devices.
const AskCard = dynamic(() => import("@components/AskCard"), { ssr: false });
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), { ssr: false });

const ABOVE_FOLD_COUNT = 4;

// ── Wheels tab ───────────────────────────────────────────────────────────────
function WheelsTab({ initialWheels, tagId }) {
  const [wheels, setWheels] = useState(initialWheels);
  const [skip, setSkip] = useState(initialWheels.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialWheels.length >= 20);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${apiConfig.apiUrl}/wheels-by-tag?tag=${encodeURIComponent(tagId)}&limit=20&skip=${skip}`
      );
      const data = await res.json();
      const next = data.wheels || [];
      if (next.length > 0) {
        setWheels((prev) => [...prev, ...next]);
        setSkip((prev) => prev + next.length);
      }
      if (next.length < 20) setHasMore(false);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [loading, tagId, skip]);

  if (wheels.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-gray-400 dark:text-gray-600 text-sm gap-2">
        <TbBrandThreads size={40} className="opacity-30" />
        <p>No wheels tagged with this topic yet.</p>
        <Link href="/dashboard" className="text-indigo-500 hover:underline text-xs mt-1">
          Create the first one →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {wheels.map((wheel, index) => {
          const showAd = (index + 1) % 6 === 0;
          const isAboveFold = index < ABOVE_FOLD_COUNT;
          return (
            <Fragment key={wheel._id || index}>
              <a
                href={`/uwheels/${wheel._id}`}
                className="group flex flex-col bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:border-indigo-500 transition-all duration-300 active:scale-[0.98]"
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
                  <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                    {wheel.title}
                  </h3>
                </div>
              </a>

              {showAd && (
                // min-h prevents CLS when AdSense loads async and pushes content down
                <div className="col-span-full my-4 md:my-6 min-h-[90px]">
                  <div className="w-full py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center min-h-[90px]">
                    <AdsUnit slot={"4694567949"} />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-12 mb-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-full shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={16} /> Loading…</>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </>
  );
}

// ── Dilemmas tab ─────────────────────────────────────────────────────────────
function DilemmasTab({ initialAsks, tagId }) {
  const [asks, setAsks] = useState(initialAsks);
  const [skip, setSkip] = useState(initialAsks.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialAsks.length >= 12);
  // Ref avoids a state variable that would cause a double-render cycle
  const didFetch = useRef(initialAsks.length > 0);

  // Server passes initialAsks=[] to keep HTML payload lean. Self-fetch on
  // first render so the user only pays the network cost if they open this tab.
  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    setLoading(true);
    fetch(`/api/ask?tag=${encodeURIComponent(tagId)}&limit=12&skip=0`)
      .then((r) => r.json())
      .then((data) => {
        const next = data.asks || [];
        setAsks(next);
        setSkip(next.length);
        setHasMore(next.length >= 12);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tagId]);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ask?tag=${encodeURIComponent(tagId)}&limit=12&skip=${skip}`
      );
      const data = await res.json();
      const next = data.asks || [];
      if (next.length > 0) {
        setAsks((prev) => [...prev, ...next]);
        setSkip((prev) => prev + next.length);
      }
      if (next.length < 12) setHasMore(false);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [loading, tagId, skip]);

  if (loading && asks.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={28} />
      </div>
    );
  }

  if (asks.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-gray-400 dark:text-gray-600 text-sm gap-2">
        <TbHelpCircle size={40} className="opacity-30" />
        <p>No community dilemmas for this topic yet.</p>
        <Link href="/ask/create" className="text-purple-500 hover:underline text-xs mt-1">
          Ask the first question →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {asks.map((ask) => (
          <AskCard key={ask._id} ask={ask} compact />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-10 mb-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-3.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-full shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={16} /> Loading…</>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TagSpaceClient({ tagId, initialWheels, initialAsks, askCount }) {
  const [activeTab, setActiveTab] = useState("wheels");

  const tabs = [
    { key: "wheels", label: "Wheels", count: initialWheels.length },
    // askCount from server stats is always accurate even when initialAsks=[] (deferred)
    { key: "dilemmas", label: "Dilemmas", count: askCount ?? initialAsks.length },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === tab.key
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}>
                {tab.count}
              </span>
            )}
            {/* Active underline */}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "wheels" && (
        <WheelsTab initialWheels={initialWheels} tagId={tagId} />
      )}
      {activeTab === "dilemmas" && (
        <DilemmasTab initialAsks={initialAsks} tagId={tagId} />
      )}
    </>
  );
}
