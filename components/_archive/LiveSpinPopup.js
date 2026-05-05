"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const SHOW_MS = 4000;    // how long each toast stays visible
const FADE_MS = 300;     // CSS transition duration
const GAP_MS = 1500;     // pause between toasts
const DELAY_MS = 3500;   // delay after page load before first toast
const POLL_MS = 60 * 60 * 1000; // re-fetch interval (1 hour)

export default function LiveSpinPopup() {
  const [dismissed, setDismissed] = useState(false);
  const [current, setCurrent] = useState(null);
  const [show, setShow] = useState(false);

  const queueRef = useRef([]);
  const idxRef = useRef(0);
  const timerRef = useRef(null);

  // Read session-level dismiss on mount (client only)
  useEffect(() => {
    try {
      if (sessionStorage.getItem("lsp-off") === "1") setDismissed(true);
    } catch {}
  }, []);

  const clearTimer = () => clearTimeout(timerRef.current);

  const showNext = useCallback(() => {
    const q = queueRef.current;
    if (!q.length) return;

    const item = q[idxRef.current % q.length];
    idxRef.current += 1;

    setCurrent(item);
    setShow(true);

    timerRef.current = setTimeout(() => {
      // Fade out
      setShow(false);
      // Wait for fade then gap, then show next
      timerRef.current = setTimeout(showNext, FADE_MS + GAP_MS);
    }, SHOW_MS);
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch("/api/activity/spinning");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Shuffle so each page load sees a different order
        queueRef.current = [...data].sort(() => Math.random() - 0.5);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (dismissed) return;

    let pollId;

    loadItems().then(() => {
      timerRef.current = setTimeout(showNext, DELAY_MS);
      pollId = setInterval(loadItems, POLL_MS);
    });

    return () => {
      clearTimer();
      clearInterval(pollId);
    };
  }, [dismissed, loadItems, showNext]);

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    setShow(false);
    clearTimer();
    try {
      sessionStorage.setItem("lsp-off", "1");
    } catch {}
  };

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={[
        // Position: above mobile bottom nav on small screens, normal corner on desktop
        "fixed bottom-[72px] right-3 sm:bottom-5 sm:right-5",
        "z-[450]",
        // Card styles
        "flex items-center gap-2.5",
        "bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-700",
        "rounded-2xl shadow-lg",
        "px-3 py-2.5",
        "max-w-[240px] min-w-[180px]",
        // Transition
        "transition-all duration-300 ease-out",
        show
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      {/* Live indicator dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>

      {/* Text */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-none mb-0.5">
          Someone is spinning
        </span>
        {current && (
          <a
            href={current.href}
            className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate hover:underline leading-tight"
            title={current.title}
            tabIndex={show ? 0 : -1}
          >
            {current.title}
          </a>
        )}
      </div>

      {/* Dismiss ×*/}
      <button
        onClick={handleDismiss}
        className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Dismiss"
        tabIndex={show ? 0 : -1}
      >
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="currentColor">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
