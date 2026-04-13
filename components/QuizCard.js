"use client";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { FaCheckCircle, FaTimesCircle, FaTrophy, FaRedo } from "react-icons/fa";

/**
 * QuizCard
 *
 * Replaces WinnerPopup when wheelType === 'quiz'.
 * Receives the landed segment as `segment` and the current quiz session
 * via the `quizState` object from useQuizState.
 */
export default function QuizCard({
  segment,       // the segData entry the wheel landed on
  segmentIndex,  // its index in segData — used as the answer key
  totalSegments, // segData.length — for progress calculation
  quizState,     // { score, totalAnswered, isAnswered, submitAnswer, resetQuiz }
  onClose,       // called when user dismisses the card
  onReset,       // called when user wants to restart the whole quiz
}) {
  const { score, totalAnswered, isAnswered, submitAnswer, resetQuiz } = quizState;

  const alreadyAnswered = isAnswered(segmentIndex);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [result, setResult] = useState(null); // { correct, selectedIndex }
  const isFinished = totalSegments > 0 && totalAnswered >= totalSegments;

  // Reset local answer state whenever a new segment is displayed
  useEffect(() => {
    if (alreadyAnswered) {
      setSelectedIndex(null);
      setResult(null);
    } else {
      setSelectedIndex(null);
      setResult(null);
    }
  }, [segmentIndex]);

  if (!segment) return null;

  const handleOptionClick = (optionIndex) => {
    if (result || alreadyAnswered) return; // already answered this spin

    const res = submitAnswer(segmentIndex, optionIndex, segment.correctIndex);
    setSelectedIndex(optionIndex);
    setResult(res);
  };

  const handleClose = () => {
    setResult(null);
    setSelectedIndex(null);
    onClose();
  };

  const handleReset = () => {
    resetQuiz();
    setResult(null);
    setSelectedIndex(null);
    onReset?.();
    onClose();
  };

  const getOptionStyle = (idx) => {
    if (!result && !alreadyAnswered) {
      return "border-input bg-card hover:bg-accent hover:text-accent-foreground";
    }
    if (idx === segment.correctIndex) {
      return "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300";
    }
    if (idx === selectedIndex && !result?.correct) {
      return "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300";
    }
    return "border-input bg-card opacity-50";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={!result ? undefined : handleClose} />

      <div className="relative z-10 w-full max-w-lg bg-card border shadow-xl rounded-2xl overflow-hidden">
        {/* Score bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-muted/60 border-b text-sm font-medium">
          <span className="text-muted-foreground">
            Question{" "}
            <span className="text-foreground font-bold">
              {totalAnswered + (result ? 0 : 0) + 1 > totalSegments
                ? totalSegments
                : totalAnswered + 1}
            </span>{" "}
            of{" "}
            <span className="text-foreground font-bold">{totalSegments}</span>
          </span>
          <span className="flex items-center gap-1 text-foreground">
            <FaTrophy className="text-yellow-500" size={14} />
            Score:{" "}
            <span className="font-bold text-primary">{score}</span> /{" "}
            {totalSegments}
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* Already answered notice */}
          {alreadyAnswered && !isFinished && (
            <div className="text-sm text-center text-muted-foreground rounded-lg border border-dashed p-3">
              You already answered this one. Spin again for a new question!
            </div>
          )}

          {/* Quiz Finished state */}
          {isFinished ? (
            <div className="text-center space-y-4 py-4">
              <FaTrophy className="mx-auto text-yellow-500" size={48} />
              <h2 className="text-2xl font-bold text-foreground">
                Quiz Complete!
              </h2>
              <p className="text-muted-foreground text-base">
                You scored{" "}
                <span className="text-primary font-extrabold text-xl">
                  {score}
                </span>{" "}
                out of{" "}
                <span className="font-bold">{totalSegments}</span>
              </p>
              {/* Score bar visual */}
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-700 ease-out rounded-full"
                  style={{
                    width: `${Math.round((score / totalSegments) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round((score / totalSegments) * 100)}% correct
              </p>
            </div>
          ) : (
            <>
              {/* Question */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Question
                </p>
                <h2 className="text-lg font-bold text-foreground leading-snug">
                  {segment.question || segment.text}
                </h2>
              </div>

              {/* Options */}
              {!alreadyAnswered && segment.options?.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {segment.options.map((option, idx) => (
                    <button
                      key={idx}
                      disabled={!!result}
                      onClick={() => handleOptionClick(idx)}
                      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 cursor-pointer disabled:cursor-default ${getOptionStyle(idx)}`}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                      {result && idx === segment.correctIndex && (
                        <FaCheckCircle className="ml-auto text-green-500 flex-shrink-0" size={16} />
                      )}
                      {result && idx === selectedIndex && !result.correct && (
                        <FaTimesCircle className="ml-auto text-red-500 flex-shrink-0" size={16} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Feedback */}
              {result && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold ${
                    result.correct
                      ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                      : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                  }`}
                >
                  {result.correct ? (
                    <FaCheckCircle size={16} />
                  ) : (
                    <FaTimesCircle size={16} />
                  )}
                  {result.correct
                    ? "Correct! Well done."
                    : `Not quite. The correct answer was: ${segment.options[segment.correctIndex]}`}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/40 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <FaRedo size={12} />
            Reset Quiz
          </Button>
          <Button size="sm" onClick={handleClose}>
            {isFinished ? "Done" : result ? "Next Question →" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
