"use client";
import { useState } from "react";

export default function WheelSuggestions() {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSuggest = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuggestions([]);
    setLoading(true);

    try {
      const res = await fetch("/api/wheelSuggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (res.ok && data?.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setMessage(data?.message || "Failed to get suggestions.");
      }
    } catch (err) {
      setMessage("Network error while fetching suggestions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h2 className="text-xl font-bold">Wheel Suggestions</h2>
      <form onSubmit={handleSuggest} className="space-y-3">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "Party Games"'
          className="w-full border rounded p-2"
        />
        <button
          type="submit"
          disabled={!prompt || loading}
          className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
        >
          {loading ? "Thinking..." : "Get Suggestions"}
        </button>
      </form>

      {message && <p className="text-red-600">{message}</p>}

      {suggestions.length > 0 && (
        <ul className="list-disc pl-6 space-y-2">
          {suggestions.map((s, idx) => (
            <li key={idx} className="text-gray-800 dark:text-gray-100">
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
