"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import TagInput from "@components/TagInput";

export default function EditListModal({ isOpen, onClose, list, isSystem = false, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("standard");
  const [tags, setTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (list) {
      setName(list.name || "");
      setDescription(list.description || "");
      setFormat(list.format || "standard");
      setTags(Array.isArray(list.tags) ? list.tags : []);
    }
  }, [list]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      await onSave({ name, description, tags, format });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {isSystem ? "View" : "Edit"} List Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800/50">
              {error}
            </div>
          )}

          {isSystem && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">ℹ️</span>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This is a system list. Its name and settings are managed automatically and cannot be changed.
              </p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              List Name
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                isSystem
                  ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                  : "bg-card border-border text-foreground hover:border-primary/50"
              }`}
              value={name}
              onChange={(e) => !isSystem && setName(e.target.value)}
              readOnly={isSystem}
              disabled={isSystem}
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              className={`w-full px-3 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none ${
                isSystem
                  ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                  : "bg-card border-border text-foreground hover:border-primary/50"
              }`}
              rows={3}
              value={description}
              onChange={(e) => !isSystem && setDescription(e.target.value)}
              readOnly={isSystem}
              disabled={isSystem}
              placeholder="Add a description for this list..."
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {description.length}/2000 characters
            </p>
          </div>

          {/* Default Format (Non-system lists only) */}
          {!isSystem && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Default Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card border-border text-foreground hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold cursor-pointer"
              >
                <option value="standard">Standard List (Collections, watchlists & guides)</option>
                <option value="tiered">Tier List (S, A, B, C, D ranking board)</option>
              </select>
            </div>
          )}

          {/* Tags Field */}
          {!isSystem && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Tags
              </label>
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder="e.g. watchlist, favorites, 2024"
              />
              <p className="text-xs text-muted-foreground mt-1.5 opacity-80">
                Tags help others discover your public lists in Tag Spaces. Press Enter or comma to add.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-foreground hover:bg-muted transition-colors"
          >
            {isSystem ? "Close" : "Cancel"}
          </button>

          {!isSystem && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
