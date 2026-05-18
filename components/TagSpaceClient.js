"use client";

import { useState, Fragment, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ThreadsIcon } from "@components/BrandIcons";
import apiConfig from "@utils/ApiUrlConfig";

// Split from the initial bundle — AdsUnit (AdSense) is not needed for the
// above-the-fold render. Lazy-loading reduces JS parse time and improves TBT.
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), { ssr: false });

const ABOVE_FOLD_COUNT = 6;

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
      <div className="flex flex-col items-center py-20 text-muted-foreground text-sm gap-2">
        <ThreadsIcon size={40} className="opacity-30" />
        <p>No wheels tagged with this topic yet.</p>
        <Link href="/dashboard" className="text-primary hover:underline text-xs mt-1">
          Create the first one →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {wheels.map((wheel, index) => {
          // Mobile & Tablet (2 & 3 cols): Show ad every 6 items (3 or 2 rows)
          const isMobileAd = (index + 1) % 6 === 0;
          // Desktop (5 cols): Show ad every 10 items (2 rows) to prevent breaking the grid
          const isDesktopAd = (index + 1) % 10 === 0;
          const showAd = isMobileAd || isDesktopAd;
          
          const isAboveFold = index < ABOVE_FOLD_COUNT;
          const thumbSrc = wheel.wheelPreview
            ? wheel.wheelPreview.replace('.webp', '-thumb.webp')
            : null;
          return (
            <Fragment key={wheel._id || index}>
              <div className="relative group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/60 transition duration-300 active:scale-[0.98]">
                <a
                  href={`/uwheels/${wheel._id}`}
                  className="flex flex-col flex-1"
                >
                  <div className="relative aspect-[4/3] w-full bg-muted flex items-center justify-center border-b border-border overflow-hidden">
                    {thumbSrc ? (
                      <Image
                        src={thumbSrc}
                        alt={wheel.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        priority={isAboveFold}
                        fetchPriority={isAboveFold ? "high" : "auto"}
                        loading={isAboveFold ? "eager" : "lazy"}
                      />
                    ) : (
                      <span className="text-muted/60 text-5xl font-black group-hover:scale-110 transition-transform">
                        {wheel.title?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="text-sm md:text-base font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {wheel.title}
                    </h3>
                  </div>
                </a>
              </div>

              {showAd && (
                // min-h prevents CLS when AdSense loads async and pushes content down
                <div className={`col-span-full my-4 md:my-6 min-h-[90px] ${
                  isMobileAd && isDesktopAd ? 'block' : isDesktopAd ? 'hidden lg:block' : 'block lg:hidden'
                }`}>
                  <div className="w-full py-2 bg-muted/50 border border-border rounded-2xl flex flex-col items-center justify-center min-h-[90px]">
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
            className="flex items-center gap-3 px-10 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black rounded-full shadow-lg shadow-primary/20 transition active:scale-95 disabled:opacity-50"
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


export default function TagSpaceClient({ tagId, initialWheels }) {
  const [activeTab, setActiveTab] = useState("wheels");

  const tabs = [
    { key: "wheels", label: "Wheels", count: initialWheels.length },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            )}
            {/* Active underline */}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "wheels" && (
        <WheelsTab initialWheels={initialWheels} tagId={tagId} />
      )}
    </>
  );
}
