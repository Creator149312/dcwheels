"use client";

import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { compressImage } from "@utils/imageCompression";

export default function AddListItemModal({ isOpen, onClose, onAdd }) {
  const [word, setWord] = useState("");
  const [wordData, setWordData] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle file selection: compress + resize before storing as preview
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 300,
        useWebWorker: false,
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        setWordData(reader.result);
      };
      reader.readAsDataURL(compressed);
    } catch {
      // Fallback to raw file if compression fails
      const reader = new FileReader();
      reader.onloadend = () => {
        setWordData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  async function materializeValue(value) {
    if (typeof value !== "string" || !value.startsWith("data:")) return value;
    setUploading(true);
    try {
      const res = await fetch("/api/upload-segment-image", {
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
    if (!word.trim()) return;
    setUploading(true);
    const resolved = await materializeValue(wordData);
    
    // Use type "word" — the API supports wordData as an image URL.
    // Entity items require entityId + slug which we don't have for custom uploads.
    const payload = {
      type: "word",
      word: word.trim(),
      wordData: resolved || "",
    };

    await onAdd(payload);

    setWord("");
    setWordData("");
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[999] px-4">
      <div className="bg-card p-6 rounded-2xl border border-border shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground bg-muted p-1.5 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold mb-1 text-foreground">
          Add Image Item
        </h2>
        <p className="text-sm text-muted-foreground mb-5">Create an item with a custom uploaded image.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Item Name</label>
            <input
              type="text"
              placeholder="e.g. Mario, Pizza, The Matrix..."
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Image <span className="text-muted-foreground font-normal">(Optional)</span></label>
            
            {wordData?.startsWith("data:image") ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border group bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={wordData} className="w-full h-full object-cover" alt="Preview" />
                <button 
                  onClick={() => setWordData("")}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium transition-opacity"
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex flex-col items-center justify-center text-muted-foreground transition-colors"
              >
                <ImageIcon size={24} className="mb-2 opacity-50" />
                <span className="text-sm font-medium">Click to upload image</span>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-xl transition"
            disabled={uploading}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={uploading || !word.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
