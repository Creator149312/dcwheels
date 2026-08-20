"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

function stripHtml(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/<[^>]+>/g, "").trim();
}

const MCQQuestion = ({ questionData }) => {
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);

  // Reset local state when question changes
  useEffect(() => {
    setAnswered(false);
    setSelectedIdx(null);
    setIsCorrect(false);
  }, [questionData]);

  if (!questionData || !Array.isArray(questionData.options) || questionData.options.length === 0) {
    return null;
  }

  const cleanTitle = stripHtml(questionData.title);
  const options = questionData.options;

  const handleAnswer = (idx, option) => {
    if (answered) return;

    const optionText = typeof option === "string" ? option : option?.text || "";
    const answerText = typeof questionData.answer === "string" ? questionData.answer : questionData.answer?.text || "";

    const correct =
      optionText.trim().toLowerCase() === answerText.trim().toLowerCase() ||
      idx === questionData.correctIndex;

    setSelectedIdx(idx);
    setIsCorrect(correct);
    setAnswered(true);
  };

  const getOptionStyle = (idx) => {
    if (!answered) {
      return "border-border bg-card hover:border-primary/60 hover:bg-primary/5 text-foreground active:scale-[0.99]";
    }
    const optionText = typeof options[idx] === "string" ? options[idx] : options[idx]?.text || "";
    const answerText = typeof questionData.answer === "string" ? questionData.answer : questionData.answer?.text || "";
    const isThisCorrect =
      optionText.trim().toLowerCase() === answerText.trim().toLowerCase() ||
      idx === questionData.correctIndex;

    if (isThisCorrect) {
      return "border-green-500/80 bg-green-500/10 text-green-700 dark:text-green-300 font-bold";
    }
    if (idx === selectedIdx && !isCorrect) {
      return "border-red-500/80 bg-red-500/10 text-red-700 dark:text-red-300 font-bold";
    }
    return "border-border bg-card opacity-50";
  };

  return (
    <div className="w-full text-left space-y-4">
      {/* Question Title */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 block mb-1">
          Quiz Question
        </span>
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug break-words">
          {cleanTitle}
        </h3>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {options.map((option, idx) => {
          const text = typeof option === "string" ? option : option?.text || "";
          const isImage = typeof option === "string" && (option.startsWith("http") || option.startsWith("data:"));

          return (
            <button
              key={idx}
              disabled={answered}
              onClick={() => handleAnswer(idx, option)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer disabled:cursor-default ${getOptionStyle(idx)}`}
            >
              {/* Option Letter Badge */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-[11px] font-bold">
                {OPTION_LABELS[idx] || idx + 1}
              </span>

              {/* Option Text or Image */}
              {isImage ? (
                <img
                  src={option}
                  alt={`Option ${OPTION_LABELS[idx]}`}
                  className="max-h-16 w-auto rounded object-contain"
                />
              ) : (
                <span className="flex-1 break-words line-clamp-2">{stripHtml(text)}</span>
              )}

              {/* Status Indicator Icon */}
              {answered && (
                <span className="shrink-0 ml-auto">
                  {((typeof text === "string" && text.trim().toLowerCase() === (questionData.answer || "").trim().toLowerCase()) || idx === questionData.correctIndex) ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : idx === selectedIdx ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : null}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Result Banner */}
      {answered && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs sm:text-sm font-bold animate-in fade-in duration-200 ${
            isCorrect
              ? "bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-300"
              : "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300"
          }`}
        >
          {isCorrect ? (
            <>
              <CheckCircle2 size={16} className="shrink-0 text-green-500" />
              <span>Correct Answer! Great job 🎉</span>
            </>
          ) : (
            <>
              <XCircle size={16} className="shrink-0 text-red-500" />
              <span>
                Incorrect. Correct answer:{" "}
                <strong className="underline font-extrabold">
                  {stripHtml(typeof questionData.answer === "string" ? questionData.answer : options[questionData.correctIndex] || "")}
                </strong>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MCQQuestion;
