"use client";

import { useState, useEffect } from "react";

export default function EditListModal({ isOpen, onClose, list, isFavorites = false, onSave }) {
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
      <div className="bg-card p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Edit List
        </h2>

        <div className="mb-4">
          <label className="block text-muted-foreground">Name</label>
          <input
            className={`w-full p-2 mt-1 rounded bg-gray-100 bg-muted ${
              isFavorites ? "opacity-50 cursor-not-allowed" : ""
            }`}
            value={name}
            onChange={(e) => { if (!isFavorites) setName(e.target.value); }}
            readOnly={isFavorites}
          />
          {isFavorites && (
            <p className="text-xs text-muted-foreground mt-1">The Favorites list cannot be renamed.</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-muted-foreground">
            Description
          </label>
          <textarea
            className="w-full p-2 mt-1 rounded bg-gray-100 bg-muted "
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 bg-muted rounded"
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
