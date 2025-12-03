"use client";
import { useState } from "react";

export default function CreateFromPrompt() {
  const [prompt, setPrompt] = useState("");
  const [generatedJson, setGeneratedJson] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/createFromPrompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (res.ok && data?.json) {
        setGeneratedJson(JSON.stringify(data.json, null, 2));
        setMessage("JSON generated successfully. Review and create!");
      } else {
        setMessage(data?.message || "Failed to generate JSON.");
      }
    } catch (err) {
      setMessage("Network error while generating JSON.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!generatedJson) {
      setMessage("No JSON to create. Generate first.");
      return;
    }

    try {
      const parsed = JSON.parse(generatedJson);
      const firstKey = Object.keys(parsed)[0];
      const payload = {
        jsonKey: firstKey,
        jsonData: parsed[firstKey],
      };

      const res = await fetch("/api/createFromJSON", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.status === 201) {
        setMessage("Wheel and Page created successfully!");
      } else {
        setMessage("Error: " + (result.message || "Unknown error"));
      }
    } catch {
      setMessage("Generated JSON is invalid. Please review.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create Wheel from Prompt (AI)</h1>

      <form onSubmit={handleGenerate} className="space-y-3">
        <label className="block text-sm font-medium">Enter your idea/prompt</label>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g., "Dota 2 Challenges Picker Wheel"'
          className="w-full border rounded p-2"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className={`px-4 py-2 rounded ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"} text-white`}
        >
          {loading ? "Generating..." : "Generate JSON"}
        </button>
      </form>

      {!!generatedJson && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Preview & Edit JSON</label>
          <textarea
            value={generatedJson}
            onChange={(e) => setGeneratedJson(e.target.value)}
            rows={16}
            className="w-full border rounded p-2 font-mono text-sm"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
          >
            Create Wheel and Page
          </button>
        </div>
      )}

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
