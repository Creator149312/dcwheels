"use client";

import { useState, useEffect } from "react";

export default function EditListModal({ isOpen, onClose, list, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (list) {
      setName(list.name || "");
      setDescription(list.description || "");
    }
  }, [list]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Edit List
        </h2>

        <div className="mb-4">
          <label className="block text-gray-600 dark:text-gray-300">Name</label>
          <input
            className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-600 dark:text-gray-300">
            Description
          </label>
          <textarea
            className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-white"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded"
          >
            Cancel
          </button>

          <button
            onClick={() => onSave({ name, description })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
