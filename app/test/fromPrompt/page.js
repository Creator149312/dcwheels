"use client";
import { useState } from "react";

export default function StagedWheelCreator() {
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState(0); // 0 = idle, 1-4 = stages
  const [message, setMessage] = useState("");
  const [wheelLink, setWheelLink] = useState("");
  const [lastRequest, setLastRequest] = useState(0);

  const RATE_LIMIT_MS = 10000; // 10 seconds

  const startProcess = async () => {
    const now = Date.now();
    if (now - lastRequest < RATE_LIMIT_MS) {
      setMessage("⏳ Rate limit exceeded. Please wait a few seconds before trying again.");
      return;
    }
    setLastRequest(now);

    setMessage("");
    setWheelLink("");
    setStage(1);

    try {
      // Stage 1: Generate JSON from prompt
      setMessage("Generating JSON from prompt...");
      const res1 = await fetch("/api/createFromPrompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data1 = await res1.json();
      if (!res1.ok || !data1?.json) {
        throw new Error(data1?.message || "Failed to generate JSON");
      }
      const generatedJson = data1.json;
      await new Promise((res) => setTimeout(res, 1500)); // smooth delay
      setStage(2);

      // Stage 2: Validate JSON
      setMessage("Validating JSON...");
      await new Promise((res) => setTimeout(res, 1500));
      const topKeys = Object.keys(generatedJson);
      if (topKeys.length !== 1) throw new Error("JSON must have one top-level key");
      const wheelData = generatedJson[topKeys[0]];
      if (
        !wheelData.title ||
        !wheelData.description ||
        !Array.isArray(wheelData.tags) ||
        !Array.isArray(wheelData.content) ||
        !Array.isArray(wheelData.segments)
      ) {
        throw new Error("JSON missing required fields");
      }
      setStage(3);

      // Stage 3: Create wheel entry
      setMessage("Creating wheel entry...");
      const payload = {
        jsonKey: topKeys[0],
        jsonData: wheelData,
      };
      const res2 = await fetch("/api/createFromJSON", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data2 = await res2.json();
      if (res2.status !== 201) {
        throw new Error(data2?.message || "Failed to create wheel entry");
      }
      await new Promise((res) => setTimeout(res, 1500));
      setStage(4);

      // Stage 4: Show link
      setMessage("✅ Wheel created successfully!");
      setWheelLink(`/wheel/${payload.jsonKey}`);
    } catch (err) {
      setMessage("❌ Error: " + err.message);
      setStage(0);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Staged Wheel Creator</h1>

      {/* Prompt input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Enter your prompt</label>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full border rounded p-2"
          placeholder='e.g. "Dota 2 Challenges Picker Wheel"'
        />
      </div>

      <button
        onClick={startProcess}
        disabled={!prompt}
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

      {/* Wheel link */}
      {wheelLink && (
        <p className="mt-4 text-center">
          🎉 View your wheel:{" "}
          <a href={wheelLink} className="text-blue-600 underline">
            {wheelLink}
          </a>
        </p>
      )}
    </div>
  );
}
