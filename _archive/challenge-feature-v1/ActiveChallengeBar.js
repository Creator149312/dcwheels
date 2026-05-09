"use client";
/**
 * ActiveChallengeBar
 * ──────────────────
 * Floating bottom banner that appears when a user has an active challenge
 * (stored in localStorage as "activeChallenge"). Follows them as they
 * navigate the site. Clears when the badge is earned or they dismiss it.
 *
 * localStorage key: "activeChallenge"
 * Value: { _id, title, tier, entityType, badgeSlug, taskInstruction }
 */
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getBadge, TIER_META } from "@data/badgeRegistry";

export const ACTIVE_CHALLENGE_KEY = "activeChallenge";

export function saveActiveChallenge(challenge) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_CHALLENGE_KEY, JSON.stringify({
    _id:             challenge._id,
    title:           challenge.title,
    tier:            challenge.tier,
    entityType:      challenge.entityType,
    badgeSlug:       challenge.badgeSlug,
    taskInstruction: challenge.taskInstruction,
    verificationHint: challenge.verificationHint,
    quizQuestions:   challenge.quizQuestions,
    quizPassThreshold: challenge.quizPassThreshold,
    active:          challenge.active,
    // Wheel-specific tracking
    wheelId:    challenge.wheelId   || null,
    wheelTitle: challenge.wheelTitle || "",
    wheelPath:  challenge.wheelPath || "",
  }));
  window.dispatchEvent(new Event("activeChallengeChanged"));
}

export function clearActiveChallenge() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_CHALLENGE_KEY);
  window.dispatchEvent(new Event("activeChallengeChanged"));
}

export function getActiveChallenge() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_CHALLENGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const ENTITY_LABEL = {
  anime:     "🎌 Spin any Anime wheel",
  movie:     "🎬 Spin any Movie wheel",
  game:      "🎮 Spin any Game wheel",
  character: "✨ Spin any Character wheel",
  "":        "🎡 Spin any wheel",
};

const ENTITY_HREF = {
  anime:     "/anime",
  movie:     "/movie",
  game:      "/game",
  character: "/character",
  "":        "/",
};

export default function ActiveChallengeBar() {
  const [challenge, setChallenge] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  const reload = () => setChallenge(getActiveChallenge());

  useEffect(() => {
    reload();
    window.addEventListener("activeChallengeChanged", reload);
    return () => window.removeEventListener("activeChallengeChanged", reload);
  }, []);

  // Re-check when user navigates
  useEffect(() => {
    setDismissed(false);
    reload();
  }, [pathname]);

  // Hide on the challenges page itself (user is already there)
  if (pathname === "/challenges") return null;
  if (!challenge || dismissed) return null;

  const badge = getBadge(challenge.badgeSlug);
  const tier = TIER_META[challenge.tier] || TIER_META.common;
  // Prefer direct wheel link if challenge is pinned to a specific wheel
  const spinHref  = challenge.wheelPath || (challenge.wheelId
    ? `/uwheels/${challenge.wheelId}`
    : (ENTITY_HREF[challenge.entityType] || "/"));
  const spinLabel = challenge.wheelId
    ? `🎡 Go to ${challenge.wheelTitle || "the wheel"}`
    : (ENTITY_LABEL[challenge.entityType] || "🎡 Spin any wheel");

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl
        bg-white dark:bg-gray-900 border-2
        ${challenge.tier === "epic"   ? "border-purple-400 dark:border-purple-600" :
          challenge.tier === "rare"   ? "border-blue-400 dark:border-blue-600" :
                                        "border-green-400 dark:border-green-600"}`}>

        {/* Badge icon */}
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${badge.color}`}>
          {badge.icon}
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
            {challenge.title}
          </p>
          <p className={`text-xs font-semibold ${tier.color}`}>
            {tier.label} Challenge active
          </p>
        </div>

        {/* CTA */}
        <a
          href={spinHref}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          {spinLabel} →
        </a>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
