"use client";

import { useEffect } from "react";

/**
 * PWAInstallTracker
 * -----------------
 * Fires two GA4 custom events with zero user-visible UI:
 *
 *   pwa_install_prompted  — browser showed the "Add to Home Screen" prompt
 *   pwa_installed         — user accepted and installed the PWA
 *
 * Both events appear in GA4 under Reports → Events and in Explore.
 * gtag() is safe to call before GA loads — commands are queued in
 * window.dataLayer until the GA script initialises.
 */
function gtag(...args) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export default function PWAInstallTracker() {
  useEffect(() => {
    // ── beforeinstallprompt ──────────────────────────────────────────────
    // Fires when the browser decides the PWA is installable and is about to
    // show (or has queued) the install prompt. Tells us how many users were
    // ever eligible to install.
    function handleBeforeInstallPrompt() {
      gtag("event", "pwa_install_prompted", {
        event_category: "PWA",
        event_label: "Install prompt shown",
        non_interaction: true,
      });
    }

    // ── appinstalled ─────────────────────────────────────────────────────
    // Fires after the user accepts the install prompt and the PWA is added
    // to their home screen / app drawer. This is the definitive install count.
    function handleAppInstalled() {
      gtag("event", "pwa_installed", {
        event_category: "PWA",
        event_label: "PWA installed",
        non_interaction: false,
      });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
