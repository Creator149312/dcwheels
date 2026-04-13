"use client";
import { useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "./ui/button";
import { FaPlus, FaTrash } from "react-icons/fa";

const OPTION_LABELS = ["A", "B", "C", "D"];

const defaultQuizSegment = () => ({
  text: "",
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  weight: 1,
  visible: true,
});

export default function QuizSegmentEditor() {
  const { segData, setSegData } = useContext(SegmentsContext);

  const updateSegment = (idx, field, value) => {
    setSegData((prev) =>
      prev.map((seg, i) => (i === idx ? { ...seg, [field]: value } : seg))
    );
  };

  const updateOption = (segIdx, optIdx, value) => {
    setSegData((prev) =>
      prev.map((seg, i) => {
        if (i !== segIdx) return seg;
        const options = [...(seg.options || ["", "", "", ""])];
        options[optIdx] = value;
        return { ...seg, options };
      })
    );
  };

  const addSegment = () => {
    setSegData((prev) => [...prev, defaultQuizSegment()]);
  };

  const removeSegment = (idx) => {
    setSegData((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 mt-3">
      {segData.map((seg, idx) => (
        <div
          key={idx}
          className="rounded-xl border bg-card p-4 space-y-3 relative"
        >
          {/* Remove button */}
          <button
            type="button"
            onClick={() => removeSegment(idx)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove question"
          >
            <FaTrash size={13} />
          </button>

          {/* Wheel label */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Wheel Label
            </label>
            <input
              type="text"
              value={seg.text || ""}
              onChange={(e) => updateSegment(idx, "text", e.target.value)}
              placeholder={`Question ${idx + 1} label`}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Question */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Question
            </label>
            <textarea
              value={seg.question || ""}
              onChange={(e) => updateSegment(idx, "question", e.target.value)}
              placeholder="Enter the full question text…"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
              Options — select the correct answer
            </label>
            <div className="space-y-2">
              {(seg.options || ["", "", "", ""]).slice(0, 4).map((opt, optIdx) => (
                <label
                  key={optIdx}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    seg.correctIndex === optIdx
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-input bg-background hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`correct-${idx}`}
                    checked={seg.correctIndex === optIdx}
                    onChange={() => updateSegment(idx, "correctIndex", optIdx)}
                    className="accent-green-500"
                  />
                  <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">
                    {OPTION_LABELS[optIdx]}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                    placeholder={`Option ${OPTION_LABELS[optIdx]}`}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSegment}
        className="w-full flex items-center gap-2"
      >
        <FaPlus size={12} />
        Add Question
      </Button>
    </div>
  );
}
