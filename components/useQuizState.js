"use client";
import { useState, useCallback } from "react";

/**
 * useQuizState
 *
 * Manages all quiz session state independently from the base useWheelState.
 * Tracks score, which segments have been answered, and quiz completion.
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
export function useQuizState() {
  // Set of segment indices that have already been answered this session
  const [answeredIndices, setAnsweredIndices] = useState(new Set());
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState(null); // { correct: bool, selectedIndex: number }

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
