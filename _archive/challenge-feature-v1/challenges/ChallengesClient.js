"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getBadge, TIER_META } from "@data/badgeRegistry";
import { saveActiveChallenge } from "@components/ActiveChallengeBar";
import ChallengeVerifyModal from "@components/ChallengeVerifyModal";

const ENTITY_TABS = [
  { label: "All",        value: "" },
  { label: "🎌 Anime",  value: "anime" },
  { label: "🎬 Movies", value: "movie" },
  { label: "🎮 Games",  value: "game" },
  { label: "✨ Characters", value: "character" },
];

const TIER_ORDER = { common: 0, rare: 1, epic: 2 };

export default function ChallengesClient() {
  const { status } = useSession();
  const [challenges, setChallenges] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [verifyTarget, setVerifyTarget] = useState(null);

  const fetchChallenges = useCallback(async (entityType) => {
    setLoading(true);
    try {
      const qs = entityType ? `?entityType=${entityType}` : "";
      const res = await fetch(`/api/challenges${qs}`);
      const data = await res.json();
      // Sort by tier (common → rare → epic)
      data.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
      setChallenges(Array.isArray(data) ? data : []);
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/challenges/active");
      const data = await res.json();
      setPendingVerifications(Array.isArray(data) ? data : []);
    } catch {}
  }, [status]);

  useEffect(() => {
    fetchChallenges(activeTab);
    fetchPending();
  }, [activeTab, fetchChallenges, fetchPending, status]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 items-center flex justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🏆 Challenge Board
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Spin the wheel, follow through, prove it — earn your badge.
          </p>
        </div>
      </div>

      {/* Pending Verifications Strip */}
      {status === "authenticated" && pendingVerifications.length > 0 && (
        <div className="mb-8 bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-4">
            ⏱️ Ready to Verify
          </h2>
          <div className="space-y-3">
            {pendingVerifications.map((pv) => {
              const badge = getBadge(pv.challenge?.badgeSlug);
              return (
                <div key={pv.decisionLogId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-indigo-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{badge?.icon || "🏆"}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {pv.challenge?.title || "Unknown Challenge"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        You spun: <span className="font-semibold text-gray-700 dark:text-gray-300">{pv.result}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setVerifyTarget(pv)}
                    className="shrink-0 w-full sm:w-auto px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                  >
                    Take Quiz →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Screen Verify Modal */}
      {verifyTarget && (
        <ChallengeVerifyModal
          challenge={verifyTarget.challenge}
          decisionLogId={verifyTarget.decisionLogId}
          resultText={verifyTarget.result}
          onClose={() => setVerifyTarget(null)}
          onBadgeEarned={() => {
            setVerifyTarget(null);
            fetchChallenges(activeTab); // update completed state
            fetchPending(); // remove from pending
          }}
        />
      )}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
              ${activeTab === tab.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Challenge grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-medium">No challenges found.</p>
          <p className="text-sm mt-1">Check back soon — new ones are added regularly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((c) => (
            <ChallengeCard key={c._id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({ challenge }) {
  const badge = getBadge(challenge.badgeSlug);
  const tier = TIER_META[challenge.tier] || TIER_META.common;
  const [expanded, setExpanded] = useState(false);

  const ENTITY_HREF = {
    anime:     "/anime",
    movie:     "/movie",
    game:      "/game",
    character: "/character",
    "":        "/",
  };

  const handleStart = () => {
    saveActiveChallenge(challenge);
    // If a specific wheel is linked, go directly to it — best for tracking
    const dest = challenge.wheelPath || (challenge.wheelId
      ? `/uwheels/${challenge.wheelId}`
      : (ENTITY_HREF[challenge.entityType] || "/"));
    window.location.href = dest;
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-shadow hover:shadow-md
        bg-white dark:bg-gray-900
        ${badge.borderColor}
        ${challenge.completed ? "opacity-75" : ""}
      `}
    >
      {/* Tier label */}
      <span className={`absolute top-3 right-3 text-xs font-semibold uppercase tracking-wide ${tier.color}`}>
        {tier.label}
      </span>

      {/* Badge icon + title */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${badge.color}`}
        >
          {badge.icon}
        </span>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
            {challenge.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {badge.title} badge
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-300 flex-1 mb-4 leading-relaxed">
        {challenge.description}
      </p>

      {/* Expanded instruction panel */}
      {expanded && !challenge.completed && (
        <div className="mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 space-y-2">
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            How to complete
          </p>
          <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 list-none">
            <li className="flex gap-2">
              <span className="font-bold text-indigo-500">1.</span>
              <span>
                {challenge.wheelId
                  ? <>Spin the <strong>{challenge.wheelTitle || "linked"}</strong> wheel.</>
                  : (challenge.taskInstruction || "Spin the relevant wheel.")
                }
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-indigo-500">2.</span>
              <span>Click <strong>"I'm watching/playing this!"</strong> in the winner popup to log your spin.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-indigo-500">3.</span>
              <span>Click <strong>"Verify Challenge & Earn Badge"</strong> and answer the quiz to prove it.</span>
            </li>
          </ol>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-1">
            {challenge.verificationHint}
          </p>
          <button
            onClick={handleStart}
            className="mt-1 w-full py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Let's Go →
          </button>
        </div>
      )}

      {/* Completion state / CTA */}
      {challenge.completed ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
          <span>✅</span>
          <span>Badge Earned</span>
        </div>
      ) : !expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center justify-center w-full py-2 rounded-xl text-sm font-medium
            bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Start Challenge →
        </button>
      ) : null}
    </div>
  );
}
