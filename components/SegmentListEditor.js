"use client";
import { useContext, useState, useRef, useEffect, memo, useCallback } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { FaTrashAlt, FaPlus, FaImage, FaEye, FaEyeSlash, FaCopy, FaListUl } from "react-icons/fa";
import { compressImage } from "@utils/imageCompression";
import toast from "react-hot-toast";

// Memoized row — only re-renders when its own `seg` object reference changes.
// Since `updateSegment` mutates with .map + spread, untouched rows keep the
// same reference, so typing in row #3 doesn't re-render the other 99 rows.
const SegmentRow = memo(function SegmentRow({
  seg,
  index,
  advancedOptions,
  fallbackColor,
  onUpdate,
  onDelete,
  onDuplicate,
  onImageUpload,
  onRemoveImage,
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 group">
      {/* Thumbnail / image upload */}
      <label
        className="relative w-9 h-9 flex-shrink-0 cursor-pointer rounded overflow-hidden bg-gray-200 dark:bg-gray-700"
        title={seg.image ? "Change image" : "Add image"}
      >
        {seg.image ? (
          <>
            <img src={seg.image} alt="" className="w-full h-full object-cover" />
            <button
              onClick={(e) => onRemoveImage(e, index)}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
              title="Remove image"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
            <FaImage size={14} />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onImageUpload(index, e.target.files[0])}
        />
      </label>

      {/* Text */}
      <input
        type="text"
        value={seg.text}
        onChange={(e) => onUpdate(index, "text", e.target.value)}
        className="flex-1 bg-transparent border-b border-transparent focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 focus:outline-none py-0.5 min-w-0"
        placeholder="Segment text..."
      />

      {/* Advanced Controls */}
      {advancedOptions && (
        <div className="flex items-center gap-1 md:gap-2 mr-1">
          <input
            type="number"
            min="0"
            value={seg.weight !== undefined ? seg.weight : 1}
            onChange={(e) => onUpdate(index, "weight", parseInt(e.target.value) || 0)}
            className="w-10 bg-transparent text-sm text-center border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-200 hide-arrows"
            title="Weight (Probability)"
          />
          <input
            type="color"
            value={seg.color || fallbackColor}
            onChange={(e) => onUpdate(index, "color", e.target.value)}
            className="w-5 h-5 p-0 border-0 rounded cursor-pointer"
            title="Segment color"
          />
          <button
            onClick={() => onUpdate(index, "visible", seg.visible === false ? true : false)}
            className={`p-1 transition-colors ${seg.visible !== false ? "text-gray-600 dark:text-gray-300 hover:text-blue-500" : "text-gray-400 dark:text-gray-600 hover:text-gray-500"}`}
            title={seg.visible !== false ? "Visible" : "Hidden"}
          >
            {seg.visible !== false ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
          </button>
          <button
            onClick={() => onDuplicate(index)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 transition-colors flex-shrink-0"
            title="Duplicate segment"
          >
            <FaCopy size={13} />
          </button>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(index)}
        className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Remove segment"
      >
        <FaTrashAlt size={13} />
      </button>
    </div>
  );
});

export default function SegmentListEditor({ bulkMode, bulkText, setBulkText, applyBulkText }) {
  const { segData, updateSegment, deleteSegment, addSegment, advancedOptions, wheelData } =
    useContext(SegmentsContext);

  // Scroll the list to the bottom when a new segment is added
  const scrollContainerRef = useRef(null);
  const prevLengthRef = useRef(segData.length);
  useEffect(() => {
    if (segData.length > prevLengthRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    prevLengthRef.current = segData.length;
  }, [segData.length]);

  const handleImageUpload = useCallback(async (index, file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      });
      // Store as a data: URL in segment state. The actual Blob upload
      // happens at wheel-save time so storage isn't consumed for wheels
      // that are never saved. See useSaveWheel.js.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(compressed);
      });
      // Detect orientation so the wheel can render the image correctly
      const imageLandscape = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > img.naturalHeight);
        img.onerror = () => resolve(false);
        img.src = dataUrl;
      });
      updateSegment(index, "image", dataUrl);
      updateSegment(index, "imageLandscape", imageLandscape);
    } catch {
      toast.error("Image upload failed. Please try again.");
    }
  }, [updateSegment]);

  const handleRemoveImage = useCallback((e, index) => {
    e.preventDefault();
    e.stopPropagation();
    updateSegment(index, "image", null);
  }, [updateSegment]);


  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">

      {bulkMode ? (
        /* ── Bulk paste mode ── */
        <div className="space-y-2 flex flex-col flex-1 min-h-0">
          <textarea
            autoFocus
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"One item per line:\nApple\nBanana\nCherry"}
            className="w-full flex-1 min-h-0 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground resize-none outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={applyBulkText}
            className="w-full shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Add to Wheel
          </button>
        </div>
      ) : (
        /* ── Card list mode ── */
        <>
          <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
            {segData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center select-none">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <FaListUl size={20} className="text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No segments yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Hit <span className="font-semibold">+ Add Segment</span> below to get started</p>
                </div>
              </div>
            ) : (
              segData.map((seg, index) => (
                <SegmentRow
                  key={seg.id ?? index}
                  seg={seg}
                  index={index}
                  advancedOptions={advancedOptions}
                  fallbackColor={wheelData.segColors[index % wheelData.segColors.length]}
                  onUpdate={updateSegment}
                  onDelete={deleteSegment}
                  onDuplicate={addSegment}
                  onImageUpload={handleImageUpload}
                  onRemoveImage={handleRemoveImage}
                />
              ))
            )}
          </div>

          {/* Add segment */}
          <button
            onClick={() => addSegment(-1)}
            className="w-full shrink-0 rounded-xl border-2 border-dashed border-border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
          >
            <FaPlus size={11} /> Add Segment
          </button>
        </>
      )}
    </div>
  );
}
