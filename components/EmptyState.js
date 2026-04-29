"use client";

import Link from "next/link";

/**
 * Shared empty-state card. Matches the design language used on the search
 * and 404 pages: icon-in-blur-halo, heading, sub copy, optional CTA.
 *
 * Usage:
 *   <EmptyState
 *     icon={Layers}
 *     title="No wheels yet"
 *     description="Create your first wheel to start exploring randomness."
 *     action={{ label: "Create a wheel", href: "/" }}
 *   />
 *
 * `action` may be either { label, href } (renders an internal Link) or any
 * ReactNode for custom controls.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  compact = false,
}) {
  const padding = compact ? "px-4 py-8 sm:px-6 sm:py-10" : "px-6 py-12 sm:px-8 sm:py-16";
  const iconSize = compact ? "h-10 w-10" : "h-12 w-12";
  const iconWrap = compact ? "h-16 w-16" : "h-20 w-20";

  return (
    <div
      className={`relative mx-auto max-w-md text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm ${padding} ${className}`}
    >
      {Icon && (
        <div className="relative mx-auto mb-5 inline-flex">
          <div
            className={`absolute inset-0 ${iconWrap} rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl`}
            aria-hidden="true"
          />
          <div
            className={`relative ${iconWrap} rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 flex items-center justify-center`}
          >
            <Icon className={`${iconSize} text-white`} strokeWidth={2} />
          </div>
        </div>
      )}

      {title && (
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}

      {description && (
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          {typeof action === "object" && action !== null && "href" in action ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
            >
              {action.label}
            </Link>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}
