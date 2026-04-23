"use client";

import { FiX } from "react-icons/fi";
import { useState } from "react";

export default function AddListItemModal({ isOpen, onClose, onAdd }) {
  const [word, setWord] = useState("");
  const [wordData, setWordData] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  // If the user pasted a base64 data URL into the textarea, push the image
  // to blob storage first and swap in the returned URL before persisting.
  // Plain text values (and already-hosted URLs) pass through unchanged.
  async function materializeValue(value) {
    if (typeof value !== "string" || !value.startsWith("data:")) return value;
    setUploading(true);
    try {
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: value }),
      });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);
      const { url } = await res.json();
      return url || value;
    } catch (err) {
      console.warn("image upload failed, falling back to data URL:", err);
      return value;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    const resolved = await materializeValue(wordData);
    const isWord = word.trim() !== "" && resolved.trim() !== "";

    const payload = isWord
      ? {
          type: "word",
          word,
          wordData: resolved,
        }
      : {
          type: "entity",
          name: word,
          image: resolved,
          entityType: "custom",
        };

    onAdd(payload);

    setWord("");
    setWordData("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-fadeIn relative">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <FiX size={22} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Add Item
        </h2>

        <input
          type="text"
          placeholder="Word or Entity Name"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="w-full mb-3 p-2 rounded bg-gray-100 dark:bg-gray-700"
        />

        <textarea
          placeholder="Word Data (text or base64 image). Leave empty for entity."
          value={wordData}
          onChange={(e) => setWordData(e.target.value)}
          className="w-full mb-4 p-2 rounded bg-gray-100 dark:bg-gray-700"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
