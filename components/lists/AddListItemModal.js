"use client";

import { FiX } from "react-icons/fi";
import { useState } from "react";

export default function AddListItemModal({ isOpen, onClose, onAdd }) {
  const [word, setWord] = useState("");
  const [wordData, setWordData] = useState("");

  if (!isOpen) return null;

  function handleSubmit() {
    const isWord = word.trim() !== "" && wordData.trim() !== "";

    const payload = isWord
      ? {
          type: "word",
          word,
          wordData,
        }
      : {
          type: "entity",
          name: word,
          image: wordData,
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
