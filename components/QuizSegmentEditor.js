"use client";
import { useContext, useEffect, useState } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "./ui/button";
import { FaPlus, FaTrash, FaBrain, FaChevronDown, FaChevronUp, FaSpinner, FaImage } from "react-icons/fa";
import { compressImage } from "@utils/imageCompression";

const OPTION_LABELS = ["A", "B", "C", "D"];

const defaultQuizSegment = (numOptions = 4) => ({
  text: "",
  question: "",
  options: Array(numOptions).fill(""),
  correctIndex: 0,
  weight: 1,
  visible: true,
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function QuizSegmentEditor() {
  const { segData, setSegData } = useContext(SegmentsContext);

  // ── AI panel state ──────────────────────────────────────────────────────────
  const [showAI, setShowAI] = useState(false);
  const [context, setContext] = useState("");
  const [numQuestions, setNumQuestions] = useState(6);
  const [numOptions, setNumOptions] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [appendMode, setAppendMode] = useState(false);

  // ── Collapsible segments state — all collapsed by default ───────────────────
  const [collapsedSet, setCollapsedSet] = useState(() => new Set(segData.map((_, i) => i)));

  useEffect(() => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      segData.forEach((_, index) => {
        if (!next.has(index)) next.add(index);
      });
      return next;
    });
  }, [segData.length]);

  const toggleCollapse = (idx) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── Segment helpers ─────────────────────────────────────────────────────────
  const updateSegment = (idx, field, value) =>
    setSegData((prev) => prev.map((seg, i) => (i === idx ? { ...seg, [field]: value } : seg)));

  const updateOption = (segIdx, optIdx, value) =>
    setSegData((prev) =>
      prev.map((seg, i) => {
        if (i !== segIdx) return seg;
        const options = [...(seg.options || Array(numOptions).fill(""))];
        options[optIdx] = value;
        return { ...seg, options };
      })
    );

  const addSegment = () => setSegData((prev) => [...prev, defaultQuizSegment(numOptions)]);

  const removeSegment = (idx) => {
    setSegData((prev) => prev.filter((_, i) => i !== idx));
    setCollapsedSet((prev) => {
      const next = new Set();
      prev.forEach((i) => {
        if (i < idx) next.add(i);
        else if (i > idx) next.add(i - 1);
      });
      return next;
    });
  };

  // ── Question image upload ───────────────────────────────────────────────────
  const handleQuestionImageUpload = async (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
      const dataUrl = await fileToDataUrl(compressed);
      updateSegment(idx, "questionImage", dataUrl);
    } catch {
      // silently ignore — user can retry
    }
    // Reset input so the same file can be re-selected after removal
    e.target.value = "";
  };

  // ── AI generation ───────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!context.trim()) { setGenError("Please describe the quiz topic first."); return; }
    setGenError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, numQuestions, numOptions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (appendMode) {
        setSegData((prev) => [...prev, ...data.segments]);
        setCollapsedSet((prev) => {
          const next = new Set(prev);
          data.segments.forEach((_, index) => next.add(segData.length + index));
          return next;
        });
      } else {
        setSegData(data.segments);
        setCollapsedSet(new Set(data.segments.map((_, index) => index)));
      }
      setShowAI(false);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col flex-1 min-h-0 gap-3">
      {/* ── AI Context Panel ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowAI((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">
            <FaBrain size={11} /> Generate with AI
          </span>
          {showAI
            ? <FaChevronUp size={10} className="text-violet-500" />
            : <FaChevronDown size={10} className="text-violet-500" />}
        </button>

        {showAI && (
          <div className="px-3 pb-3 space-y-3 border-t border-violet-200 dark:border-violet-800/50 pt-3">
            {/* Context */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Topic / Context
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Harry Potter books, World War II history, JavaScript fundamentals…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Questions
                </label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {[3, 4, 5, 6, 7, 8, 10, 12, 15].map((n) => (
                    <option key={n} value={n}>{n} questions</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Options each
                </label>
                <select
                  value={numOptions}
                  onChange={(e) => setNumOptions(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value={2}>2 options</option>
                  <option value={3}>3 options</option>
                  <option value={4}>4 options</option>
                </select>
              </div>
            </div>

            {/* Append / Replace toggle */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Mode
              </label>
              <div className="flex rounded-md overflow-hidden border border-input text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAppendMode(false)}
                  className={`flex-1 py-1.5 transition-colors ${!appendMode ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-accent"}`}
                >
                  Replace all
                </button>
                <button
                  type="button"
                  onClick={() => setAppendMode(true)}
                  className={`flex-1 py-1.5 border-l border-input transition-colors ${appendMode ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-accent"}`}
                >
                  Append
                </button>
              </div>
            </div>

            {genError && (
              <p className="text-xs text-destructive">{genError}</p>
            )}

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !context.trim()}
              className="w-full flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              size="sm"
            >
              {generating
                ? <><FaSpinner className="animate-spin" size={12} /> Generating…</>
                : <><FaBrain size={12} /> {appendMode ? "Append" : "Generate"} {numQuestions} Questions</>}
            </Button>

            {!appendMode && segData.length > 0 && (
              <p className="text-[11px] text-muted-foreground text-center">
                ⚠ This will replace your {segData.length} existing question{segData.length !== 1 ? "s" : ""}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Questions list (scrollable, fills available height) ───────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
        {segData.map((seg, idx) => {
          const isCollapsed = collapsedSet.has(idx);
          return (
            <div key={idx} className="rounded-xl border bg-card">
              {/* ── Segment header (always visible) ──── */}
              <button
                type="button"
                onClick={() => toggleCollapse(idx)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground truncate min-w-0">
                  <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary/70">
                    Q{idx + 1}
                  </span>
                  {seg.question ? (
                    <span className="truncate">{seg.question.length > 50 ? seg.question.slice(0, 50) + "…" : seg.question}</span>
                  ) : seg.text ? (
                    <span className="truncate text-muted-foreground/60">{seg.text}</span>
                  ) : (
                    <span className="text-muted-foreground/40 italic">Untitled question</span>
                  )}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); removeSegment(idx); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); removeSegment(idx); } }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    aria-label="Remove question"
                  >
                    <FaTrash size={11} />
                  </span>
                  {isCollapsed
                    ? <FaChevronDown size={10} className="text-muted-foreground" />
                    : <FaChevronUp size={10} className="text-muted-foreground" />}
                </div>
              </button>

              {/* ── Segment body (collapsible) ──── */}
              {!isCollapsed && (
                <div className="px-3 pb-3 space-y-3 border-t">
                  {/* Wheel label */}
                  <div className="pt-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Wheel Label
                    </label>
                    <input
                      type="text"
                      value={seg.text || ""}
                      onChange={(e) => updateSegment(idx, "text", e.target.value)}
                      placeholder={`Short label for slice ${idx + 1}`}
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

                  {/* Question Image */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Question Image <span className="text-[10px] normal-case font-normal">(optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleQuestionImageUpload(idx, e)}
                        className="hidden"
                        id={`q-img-${idx}`}
                      />
                      <label
                        htmlFor={`q-img-${idx}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-input cursor-pointer hover:bg-accent text-xs text-muted-foreground transition-colors"
                      >
                        <FaImage size={11} />
                        {seg.questionImage ? "Change" : "Add image"}
                      </label>
                      {seg.questionImage && (
                        <>
                          <img src={seg.questionImage} alt="Preview" className="h-8 w-12 rounded object-cover border" />
                          <button
                            type="button"
                            onClick={() => updateSegment(idx, "questionImage", null)}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                      Options — select the correct answer
                    </label>
                    <div className="space-y-1.5">
                      {(seg.options || []).map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors ${
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
                            className="accent-green-500 flex-shrink-0"
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
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSegment}
        className="w-full flex items-center gap-2 flex-shrink-0"
      >
        <FaPlus size={12} />
        Add Question
      </Button>
    </div>
  );
}

