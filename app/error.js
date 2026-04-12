"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log to error tracking service when available
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
        An unexpected error occurred. Try again or return home.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
