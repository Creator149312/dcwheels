"use client";

import Link from "next/link";
import { useEffect, useState, Fragment } from "react";
import { Hash, ChevronRight, LayoutGrid } from "lucide-react";
import AdsUnit from "@components/ads/AdsUnit";

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tags-data")
      .then((res) => res.json())
      .then((data) => {
        setTags(data.tags || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch tags", err);
        setLoading(false);
      });
  }, []);

  // Ad interval: place an ad after every 8 tags
  const adInterval = 8;

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LayoutGrid
                size={20}
                className="text-primary"
              />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
              Tag <span className="text-primary">Directory</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Browse our full collection of spin wheels by category.
          </p>
        </div>
      </div>

      {/* Main Tags Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? [...Array(12)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-muted rounded-3xl animate-pulse"
              />
            ))
          : tags.map((tagObj, index) => {
              const showInlineAd = (index + 1) % adInterval === 0;
              const slug = typeof tagObj === 'string' ? tagObj : (tagObj.slug || tagObj.name);
              const displayName = typeof tagObj === 'string' ? tagObj : (tagObj.name || tagObj.slug);

              return (
                <Fragment key={slug}>
                  <Link
                    href={`/tags/${encodeURIComponent(slug)}`}
                    className="group relative flex items-center p-5 bg-card text-card-foreground rounded-3xl border border-border hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary transition-colors duration-300 border border-border">
                      <span className="text-lg font-black text-muted-foreground group-hover:text-primary-foreground uppercase">
                        {String(displayName).charAt(0)}
                      </span>
                    </div>

                    <div className="ml-4 flex-1">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {displayName}
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-0.5">
                        {typeof tagObj === 'object' && tagObj.count ? `${tagObj.count} Wheels` : 'Explore Wheels'}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0"
                    />
                  </Link>

                  {/* Inline Native Ad Slot */}
                  {/* {showInlineAd && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-1 h-full">
                    <div className="h-full min-h-[110px] p-4 bg-blue-50/30 dark:bg-blue-900/10 border border-dashed border-blue-100 dark:border-blue-800/40 rounded-3xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] uppercase tracking-widest text-blue-500 font-black mb-2">Sponsored</span>
                      <div className="w-full h-12 bg-white/60 dark:bg-gray-800/60 rounded-lg flex items-center justify-center">
                         <p className="text-[10px] text-gray-400">Native Ad Unit</p>
                      </div>
                    </div>
                  </div>
                )} */}
                </Fragment>
              );
            })}
      </div>

      {/* Bottom Ad Section */}
      {!loading && tags.length > 0 && (
        <div className="col-span-full my-4 md:my-6">
          <div className="w-full py-2 bg-muted/50 border border-border rounded-2xl flex flex-col items-center justify-center">
            <AdsUnit slot={"4694567949"} />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Hash size={48} className="text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">No tags found yet.</p>
        </div>
      )}
    </div>
  );
}
