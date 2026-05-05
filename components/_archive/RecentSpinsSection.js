"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TbLoader2, TbUser } from "react-icons/tb";
import { timeAgo } from "@utils/HelperFunctions";

/**
 * RecentSpinsSection — client component that fetches and displays public
 * DecisionLog entries for a specific content entity (movie, anime, game, etc.).
 *
 * Rendered inside TopicInteractionTabs. Hidden when there are 0 results so
 * the section only appears once real community spin data exists.
 *
 * Props:
 *  - entityType  "movie" | "anime" | "game" | "character"
 *  - entityId    stringified external API ID (e.g. "550", "1535")
 *  - entityTitle display title — used in the empty-state CTA
 *  - entitySlug  slug for the content page (optional — for linking)
 */
export default function RecentSpinsSection({ entityType, entityId, entityTitle }) {
  const [spins, setSpins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityType || !entityId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/decisionlog/by-entity?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&limit=10`
        );
        if (!res.ok) throw new Error("fetch failed");
        const { spins: data } = await res.json();
        if (!cancelled) setSpins(data || []);
      } catch {
        // Non-critical — fail silently; section stays hidden.
        if (!cancelled) setSpins([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400 dark:text-gray-600">
        <TbLoader2 className="animate-spin" size={16} />
        Loading recent spins…
      </div>
    );
  }

  if (spins.length === 0) return null;

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-green-500 inline-block" aria-hidden="true" />
        Recent Spins
        <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
          — what others landed on
        </span>
      </h3>

      <div className="flex flex-col gap-2">
        {spins.map((spin) => (
          <SpinCard key={spin.id} spin={spin} entityType={entityType} />
        ))}
      </div>

      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-600">
        Spins are shown publicly only when the user has opted in via Account Settings.
      </p>
    </section>
  );
}

function SpinCard({ spin, entityType }) {
  const contentLabel = {
    movie:     "movie wheel",
    anime:     "anime wheel",
    game:      "game wheel",
    character: "character wheel",
  }[entityType] || "wheel";

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Result thumbnail — show poster if available, else generic icon */}
      {spin.resultImage ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
          <Image
            src={spin.resultImage}
            alt={spin.result}
            width={40}
            height={40}
            className="object-cover w-full h-full"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
          🎡
        </div>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {spin.result}
        </p>

        {spin.note && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
            &ldquo;{spin.note}&rdquo;
          </p>
        )}

        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
          <TbUser size={11} />
          <span>{spin.authorName}</span>
          {spin.wheelTitle && (
            <>
              <span>·</span>
              <span>via {spin.wheelTitle}</span>
            </>
          )}
          {spin.createdAt && (
            <>
              <span>·</span>
              <span>{timeAgo(spin.createdAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* If the result has a content page link, show it */}
      {spin.entitySlug && entityType && (
        <Link
          href={`/${entityType}/${spin.entitySlug}`}
          className="flex-shrink-0 text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          View
        </Link>
      )}
    </div>
  );
}
