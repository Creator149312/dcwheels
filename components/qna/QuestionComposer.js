"use client";

import { useState, useEffect } from "react";

export default function QuestionComposer({
  type,               // contentType: "anime", "movie", "game"
  contentId,
  isLoggedIn,
  onCreated,
  openLoginPrompt,
}) {
  const [qType, setQType] = useState("yesno");
  const [text, setText] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-fill options for yes/no
  useEffect(() => {
    if (qType === "yesno") {
      setOptions(["Yes", "No"]);
    } else if (qType === "multi") {
      setOptions(["Option A", "Option B"]);
    } else {
      setOptions([]);
    }
  }, [qType]);

  const canSubmit =
    text.trim().length >= 10 &&
    (qType === "open" || options.filter((o) => o.trim()).length >= 2);

  const addOption = () =>
    setOptions([...options, `Option ${options.length + 1}`]);

  const updateOption = (i, val) =>
    setOptions(options.map((opt, idx) => (i === idx ? val : opt)));

  const removeOption = (i) =>
    setOptions(options.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) return openLoginPrompt?.();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: qType,
          text: text.trim(),
          contentType: type,
          contentId,
          options: qType === "open" ? [] : options.filter((o) => o.trim()),
        }),
      });
      if (!res.ok) throw new Error("Failed to create question");
      const newQ = await res.json();
      onCreated?.(newQ);
      setText("");
      if (qType === "multi") setOptions(["Option A", "Option B"]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-md p-4 bg-white dark:bg-gray-900">
      <h4 className="text-sm font-semibold mb-3">Ask a Question</h4>

      {/* Question type selector */}
      <div className="flex gap-2 mb-3">
        {["yesno", "multi", "open"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setQType(t)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md border ${
              qType === t
                ? "border-blue-600 text-blue-600"
                : "border-gray-300 dark:border-gray-700"
            }`}
          >
            {t === "yesno" && "Yes / No"}
            {t === "multi" && "Multiple Choice"}
            {t === "open" && "Open‑ended"}
          </button>
        ))}
      </div>

      {/* Question form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Ask something clear…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border p-2 text-sm"
        />

        {/* Options for multi-choice */}
        {qType === "multi" && (
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="flex-1 rounded-md border p-2 text-sm"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-xs border px-2 rounded-md"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-xs border px-2 py-1 rounded-md"
            >
              + Add Option
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
            canSubmit ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"
          }`}
        >
          {loading ? "Posting…" : "Ask Question"}
        </button>
      </form>
    </div>
  );
}
