"use client";
import { useState } from "react";

export default function StagedContentCreator() {
  const [title, setTitle] = useState("");
  const [segments, setSegments] = useState("");
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState("");
  const [pageLink, setPageLink] = useState("");
  const [lastRequest, setLastRequest] = useState(0);

  const RATE_LIMIT_MS = 10000;

  const startProcess = async () => {
    const now = Date.now();
    if (now - lastRequest < RATE_LIMIT_MS) {
      setMessage("⏳ Rate limit exceeded. Please wait a few seconds.");
      return;
    }
    setLastRequest(now);

    setMessage("");
    setPageLink("");
    setStage(1);

    try {
      // ✅ Stage 1: Generate JSON from title + segments
      setMessage("Generating structured JSON from your input...");
      const res1 = await fetch("/api/createFromList", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          items: segments.split("\n").map((i) => i.trim()).filter(Boolean),
        }),
      });

      const data1 = await res1.json();
      if (!res1.ok || !data1?.json) {
        throw new Error(data1?.message || "Failed to generate JSON");
      }

      const generatedJson = data1.json;
      await new Promise((res) => setTimeout(res, 1200));
      setStage(2);

      // ✅ Stage 2: Validate JSON
      setMessage("Validating generated JSON...");
      await new Promise((res) => setTimeout(res, 1200));

      const topKeys = Object.keys(generatedJson);
      if (topKeys.length !== 1)
        throw new Error("JSON must have one top-level key");

      const pageData = generatedJson[topKeys[0]];

      if (
        !pageData.title ||
        !pageData.description ||
        !Array.isArray(pageData.tags) ||
        !Array.isArray(pageData.content) ||
        !Array.isArray(pageData.segments)
      ) {
        throw new Error("JSON missing required fields");
      }

      setStage(3);

      // ✅ Stage 3: Create entry
      setMessage("Creating page entry...");
      const payload = {
        jsonKey: topKeys[0],
        jsonData: pageData,
      };

      const res2 = await fetch("/api/createFromJSON", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data2 = await res2.json();
      if (res2.status !== 201) {
        throw new Error(data2?.message || "Failed to create entry");
      }

      await new Promise((res) => setTimeout(res, 1200));
      setStage(4);

      // ✅ Stage 4: Show link
      setMessage("✅ Page created successfully!");
      setPageLink(`/page/${payload.jsonKey}`);
    } catch (err) {
      setMessage("❌ Error: " + err.message);
      setStage(0);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">AI Page Generator</h1>

      {/* Title input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded p-2"
          placeholder='e.g. "Diep.io Tank List"'
        />
      </div>

      {/* Segments input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Segments (one per line)</label>
        <textarea
          value={segments}
          onChange={(e) => setSegments(e.target.value)}
          className="w-full border rounded p-2 h-40"
          placeholder="Tank\nTwin\nSniper\nMachine Gun\nFlank Guard"
        />
      </div>

      <button
        onClick={startProcess}
        disabled={!title || !segments.trim()}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Start Process
      </button>

      {/* Progress bar */}
      <div className="flex justify-between items-center mt-6">
        {[1, 2, 3, 4].map((num) => (
          <div
            key={num}
            className={`flex-1 h-2 mx-1 rounded ${
              stage >= num ? "bg-blue-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-sm mt-2">
        <span>1. Generate</span>
        <span>2. Validate</span>
        <span>3. Create</span>
        <span>4. Link</span>
      </div>

      {/* Status message */}
      {message && <p className="mt-4 text-center">{message}</p>}

      {/* Page link */}
      {pageLink && (
        <p className="mt-4 text-center">
          🎉 View your page:{" "}
          <a href={pageLink} className="text-blue-600 underline">
            {pageLink}
          </a>
        </p>
      )}
    </div>
  );
}
