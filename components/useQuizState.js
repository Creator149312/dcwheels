"use client";
import { useState, useCallback, useEffect } from "react";

/**
 * useQuizState
 *
 * Manages all quiz session state independently from the base useWheelState.
 * Tracks score, which segments have been answered, and quiz completion.
 *
 * Session persistence: Optionally accepts a wheelId string to persist
 * in-progress quiz score and answered questions in sessionStorage across tab reloads.
 *
 * Segment quiz schema expected:
 * {
 *   text: string,          // shown on the wheel
 *   question: string,       // full question prompt shown in QuizCard
 *   options: string[],      // 2–4 answer choices
 *   correctIndex: number,  // index into options[] that is correct
 *   weight?: number,
 *   visible?: boolean,
 * }
 */
export function useQuizState(wheelId = null) {
  const sessionKey = wheelId ? `SpinpapaQuizState_${wheelId}` : null;

  // Initialize from sessionStorage if available
  const [answeredIndices, setAnsweredIndices] = useState(() => {
    if (!sessionKey || typeof window === "undefined") return new Set();
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.answeredIndices)) {
          return new Set(parsed.answeredIndices);
        }
      }
    } catch {}
    return new Set();
  });

  const [score, setScore] = useState(() => {
    if (!sessionKey || typeof window === "undefined") return 0;
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.score === "number") return parsed.score;
      }
    } catch {}
    return 0;
  });

  const [lastResult, setLastResult] = useState(null); // { correct: bool, selectedIndex: number }

  // Persist score & answered indices when they change
  useEffect(() => {
    if (!sessionKey || typeof window === "undefined") return;
    try {
      if (answeredIndices.size > 0) {
        sessionStorage.setItem(
          sessionKey,
          JSON.stringify({
            score,
            answeredIndices: Array.from(answeredIndices),
          })
        );
      } else {
        sessionStorage.removeItem(sessionKey);
      }
    } catch {}
  }, [sessionKey, score, answeredIndices]);

  /**
   * Returns whether the question at `index` has already been answered.
   */
  const isAnswered = useCallback(
    (index) => answeredIndices.has(index),
    [answeredIndices]
  );

  /**
   * Called when the user selects an option in QuizCard.
   * Returns true if the answer was correct.
   */
  const submitAnswer = useCallback(
    (segmentIndex, selectedOptionIndex, correctIndex) => {
      if (answeredIndices.has(segmentIndex)) return null; // already answered

      const correct = selectedOptionIndex === correctIndex;
      if (correct) setScore((s) => s + 1);

      const result = { correct, selectedIndex: selectedOptionIndex };
      setLastResult(result);
      setAnsweredIndices((prev) => new Set([...prev, segmentIndex]));
      return result;
    },
    [answeredIndices]
  );

  /** Reset for a new quiz session */
  const resetQuiz = useCallback(() => {
    setAnsweredIndices(new Set());
    setScore(0);
    setLastResult(null);
  }, []);

  return {
    score,
    answeredIndices,
    totalAnswered: answeredIndices.size,
    lastResult,
    isAnswered,
    submitAnswer,
    resetQuiz,
  };
}
