"use client";

/**
 * WheelSpinFeed — public per-wheel "Spin Stories" feed.
 *
 * Renders the most recent public saved decisions for a wheel as small
 * "Sarah got Goku · 4m ago" cards. This is the *fresh UGC surface* that
 * makes each wheel page uniquely valuable to crawlers (Information Gain)
 * and gives users a social signal that the wheel is alive.
 *
 * Data flow mirrors WheelStatsBar:
 *   - SSR seeds `initialStories` so the feed is in the indexable HTML.
 *   - On the spinning user's "save decision" event, we OPTIMISTICALLY
 *     prepend their card without a network call.
 *   - A 60s background refresh (visibility-gated) reconciles with other
 *     users' activity. Same low-cost posture as the stats bar.
 *
 * Privacy note: the SSR-seeded list only contains decisions where the
 * author opted in via `publicSpins` in profile settings. The optimistic
 * prepend listens for a new `wheel:decision-saved` event that carries
 * `isPublic` so we don't leak a private save into the visible feed.
 */

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { timeAgo } from "@utils/HelperFunctions";
import Image from "next/image";

function getInitial(name) {
  return name && typeof name === "string"
    ? name.charAt(0).toUpperCase()
    : "?";
}

export default function WheelSpinFeed({
  wheelId,
  initialStories = [],
}) {
  const [stories, setStories] = useState(() =>
    Array.isArray(initialStories) ? initialStories : []
  );

  useEffect(() => {
    if (!wheelId) return;

    // Optimistic prepend on save. Always show the card to the saving user
    // immediately — if their publicSpins setting is off (isPublic: false),
    // the card is __local-only and survives background refreshes until the
    // user navigates away. Public cards will also come back from the server
    // on the next refresh, at which point the __local version is replaced.
    const onDecisionSaved = (event) => {
      const detail = event?.detail || {};
      if (detail.wheelId !== wheelId) return;
      if (!detail.result) return;

      setStories((prev) => {
        const next = [
          {
            id: `local-${Date.now()}`,
            userName: detail.userName || "You",
            result: detail.result,
            resultImage: detail.resultImage || "",
            note: detail.note || "",
            createdAt: new Date().toISOString(),
            isPublic: !!detail.isPublic,
            __local: true,
          },
          ...prev,
        ];
        return next.slice(0, 10);
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("wheel:decision-saved", onDecisionSaved);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("wheel:decision-saved", onDecisionSaved);
      }
    };
  }, [wheelId]);

  // Hide the section entirely when there is nothing to show. An empty feed
  // looks worse than no feed. The section appears as soon as any spin is
  // saved (public or local-only for the saving user).
  if (!stories || stories.length === 0) return null;

  return (
    <section
      aria-label="Recent saved decisions"
      className="mt-4 mb-4 rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 sm:p-5"
    >
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        <Users className="inline -mt-0.5 mr-1" size={16} />
        Recent results
      </h2>

      <ul className="space-y-3">
        {stories.map((s) => (
          <li
            key={s.id}
            className="flex items-start gap-3 text-sm"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
              {getInitial(s.userName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-gray-800 dark:text-gray-200 leading-snug">
                <span className="font-semibold">{s.userName}</span>{" "}
                got{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {s.result}
                </span>
              </p>
              {s.resultImage && (
                <div className="mt-2.5 mb-2 w-full h-32 sm:h-40 relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <Image 
                    src={s.resultImage} 
                    alt={s.result} 
                    fill 
                    className="object-contain hover:scale-105 transition-transform duration-300" 
                    sizes="(max-width: 768px) 100vw, 320px"
                  />
                </div>
              )}
              {s.note ? (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  “{s.note}”
                </p>
              ) : null}
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                {s.createdAt ? timeAgo(s.createdAt) : ""}
                {s.__local && !s.isPublic ? (
                  <span className="ml-1.5 text-gray-400 dark:text-gray-600">
                    · visible to you only
                  </span>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
