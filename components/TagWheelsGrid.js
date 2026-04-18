"use client";

import { useState, Fragment, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import apiConfig from "@utils/ApiUrlConfig";
import AdsUnit from "./ads/AdsUnit";

export default function TagWheelsGrid({ initialWheels, tagId }) {
  const [wheels, setWheels] = useState(initialWheels);
  const [skip, setSkip] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialWheels.length >= 20);
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 1024);
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
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

  const adInterval = isMobile === null ? null : isMobile ? 6 : 10;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {wheels.map((wheel, index) => {
          const showAd = adInterval !== null && (index + 1) % adInterval === 0;

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

              {/* ✅ Responsive Ad Injection using col-span-full */}
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
