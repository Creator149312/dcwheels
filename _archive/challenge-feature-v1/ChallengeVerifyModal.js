"use client";
/**
 * ChallengeVerifyModal
 * ─────────────────────
 * Shown when a user wants to verify challenge completion.
 * Generates 3-5 AI quiz questions about their spun result,
 * scores their answers, and awards a badge on pass.
 *
 * Props:
 *   challenge      — Challenge document (from /api/challenges)
 *   decisionLogId  — ID of the DecisionLog entry for this spin
 *   spinResult     — The text result of the spin (e.g. "Attack on Titan")
 *   onClose        — Called when user dismisses
 *   onBadgeEarned  — Called with badge data when user passes
 */
import { useState } from "react";
import { getBadge, TIER_META } from "@data/badgeRegistry";

export default function ChallengeVerifyModal({
  challenge,
  decisionLogId,
  spinResult,
  onClose,
  onBadgeEarned,
}) {
  const [phase, setPhase] = useState("intro"); // intro | loading | quiz | result
  const [questions, setQuestions] = useState([]);
  const [token, setToken] = useState(null);
  const [answers, setAnswers] = useState([]); // array of selected option indexes
  const [result, setResult] = useState(null); // { passed, correct, total, badge? }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const badge = getBadge(challenge.badgeSlug);
  const tier = TIER_META[challenge.tier] || TIER_META.common;

  // ── Step 1: Generate questions ─────────────────────────────────────────
  const generateQuestions = async () => {
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/challenges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          challengeId: challenge._id,
          decisionLogId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not generate questions.");
        setPhase("intro");
        return;
      }
      setQuestions(data.questions);
      setToken(data.token);
      setAnswers(new Array(data.questions.length).fill(null));
      setPhase("quiz");
    } catch {
      setError("Network error. Please try again.");
      setPhase("intro");
    }
  };

  // ── Step 2: Submit answers ─────────────────────────────────────────────
  const submitAnswers = async () => {
    if (answers.some((a) => a === null)) {
      setError("Answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/challenges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          challengeId: challenge._id,
          decisionLogId,
          token,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed.");
        setSubmitting(false);
        return;
      }
      setResult(data);
      setPhase("result");
      if (data.passed && data.badge) {
        onBadgeEarned?.(data.badge);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectAnswer = (qIdx, optIdx) => {
    if (phase !== "quiz") return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header strip */}
        <div className={`h-1.5 w-full ${challenge.tier === "epic" ? "bg-purple-500" : challenge.tier === "rare" ? "bg-blue-500" : "bg-green-500"}`} />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* ── INTRO phase ─────────────────────────────────────────── */}
          {phase === "intro" && (
            <div className="text-center">
              <span className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl mb-4 ${badge.color}`}>
                {badge.icon}
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Verify Challenge
              </h2>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${tier.color}`}>
                {tier.label} — {challenge.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                You spun: <strong className="text-gray-900 dark:text-white">{spinResult}</strong>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {challenge.verificationHint || `Answer ${challenge.quizQuestions || 3} questions to earn the badge.`}
              </p>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
              )}
              <button
                onClick={generateQuestions}
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Start Quiz →
              </button>
            </div>
          )}

          {/* ── LOADING phase ────────────────────────────────────────── */}
          {phase === "loading" && (
            <div className="text-center py-8">
              <div className="inline-block w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generating questions about <strong>{spinResult}</strong>…
              </p>
            </div>
          )}

          {/* ── QUIZ phase ───────────────────────────────────────────── */}
          {phase === "quiz" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 dark:text-white text-base">
                  Quiz — {spinResult}
                </h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {answers.filter((a) => a !== null).length}/{questions.length} answered
                </span>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {questions.map((q, qi) => (
                  <div key={qi}>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                      <span className="text-indigo-500 font-bold mr-1">{qi + 1}.</span>
                      {q.question}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt, oi) => {
                        const selected = answers[qi] === oi;
                        return (
                          <button
                            key={oi}
                            onClick={() => selectAnswer(qi, oi)}
                            className={`text-left px-4 py-2.5 rounded-xl text-sm border transition-all
                              ${selected
                                ? "bg-indigo-600 border-indigo-600 text-white font-medium"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                              }`}
                          >
                            <span className="font-semibold mr-2 opacity-60">
                              {String.fromCharCode(65 + oi)}.
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>
              )}

              <button
                onClick={submitAnswers}
                disabled={submitting || answers.some((a) => a === null)}
                className="mt-5 w-full py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Checking…" : "Submit Answers"}
              </button>
            </div>
          )}

          {/* ── RESULT phase ─────────────────────────────────────────── */}
          {phase === "result" && result && (
            <div className="text-center">
              {result.passed ? (
                <>
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Badge Earned!
                  </h2>
                  <span className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl my-4 ${badge.color}`}>
                    {badge.icon}
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">{badge.title}</p>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${tier.color}`}>
                    {tier.label} Badge
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    You answered {result.correct}/{result.total} correctly.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      Awesome!
                    </button>
                    <a
                      href="/challenges"
                      className="flex-1 py-2.5 rounded-xl font-semibold text-center text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      More Challenges
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">😅</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Not quite!
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    You got {result.correct}/{result.total}.{" "}
                    Need {challenge.quizPassThreshold || 2} to pass.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    Give the content another look and try again.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setPhase("intro"); setResult(null); setAnswers([]); }}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
