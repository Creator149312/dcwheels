"use client";
import { useContext, useState } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { FaTrashAlt, FaPlus, FaImage, FaClipboardList, FaEye, FaEyeSlash, FaCopy, FaRandom, FaSortAlphaDown } from "react-icons/fa";
import imageCompression from "browser-image-compression";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";

export default function SegmentListEditor() {
  const { segData, setSegData, updateSegment, deleteSegment, addSegment, html, advancedOptions, wheelData } =
    useContext(SegmentsContext);

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 200,
        useWebWorker: true,
      });
      const reader = new FileReader();
      reader.onload = (e) => updateSegment(index, "image", e.target.result);
      reader.readAsDataURL(compressed);
    } catch {}
  };

  const handleRemoveImage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    updateSegment(index, "image", null);
  };

  const applyBulkText = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const newSegments = lines.map((text) => ({ text, weight: 1, visible: true }));
    setSegData(newSegments);
    html.current = segmentsToHTMLTxt(newSegments);
    setBulkMode(false);
    setBulkText("");
  };

  const shuffleSegments = () => {
    const shuffled = [...segData].sort(() => Math.random() - 0.5);
    setSegData(shuffled);
    html.current = segmentsToHTMLTxt(shuffled);
  };

  const sortSegments = () => {
    const sorted = [...segData].sort((a, b) => {
      const aHasImg = !!a.image;
      const bHasImg = !!b.image;
      if (aHasImg && !bHasImg) return -1;
      if (!aHasImg && bHasImg) return 1;
      return (a.text || "").localeCompare(b.text || "");
    });
    setSegData(sorted);
    html.current = segmentsToHTMLTxt(sorted);
  };

  return (
    <div className="space-y-1 mt-1">
      {/* Toolbox header */}
      <div className="flex justify-between items-center mb-1 px-1">
        <div className="flex gap-4">
          <button
            onClick={shuffleSegments}
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title="Shuffle segments"
          >
            <FaRandom size={13} />
          </button>
          <button
            onClick={sortSegments}
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title="Sort alphabetically"
          >
            <FaSortAlphaDown size={14} />
          </button>
        </div>
        <button
          onClick={() => setBulkMode((p) => !p)}
          className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 transition-colors"
        >
          <FaClipboardList size={12} />
          {bulkMode ? "Cancel" : "Paste list"}
        </button>
      </div>

      {bulkMode ? (
        /* ── Bulk paste mode ── */
        <div className="space-y-2">
          <textarea
            autoFocus
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={7}
            placeholder={"One item per line:\nApple\nBanana\nCherry"}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={applyBulkText}
            className="w-full py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            Add to Wheel
          </button>
        </div>
      ) : (
        /* ── Card list mode ── */
        <>
          <div className="overflow-y-auto max-h-64 space-y-1 pr-0.5">
            {segData.map((seg, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 group"
              >
                {/* Thumbnail / image upload */}
                <label
                  className="relative w-9 h-9 flex-shrink-0 cursor-pointer rounded overflow-hidden bg-gray-200 dark:bg-gray-700"
                  title={seg.image ? "Change image" : "Add image"}
                >
                  {seg.image ? (
                    <>
                      <img
                        src={seg.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {/* Remove image on hover */}
                      <button
                        onClick={(e) => handleRemoveImage(e, index)}
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
                    onChange={(e) => handleImageUpload(index, e.target.files[0])}
                  />
                </label>

                {/* Text */}
                <input
                  type="text"
                  value={seg.text}
                  onChange={(e) => updateSegment(index, "text", e.target.value)}
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
                      onChange={(e) => updateSegment(index, "weight", parseInt(e.target.value) || 0)}
                      className="w-10 bg-transparent text-sm text-center border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-800 dark:text-gray-200 hide-arrows"
                      title="Weight (Probability)"
                    />
                    <input
                      type="color"
                      value={seg.color || wheelData.segColors[index % wheelData.segColors.length]}
                      onChange={(e) => updateSegment(index, "color", e.target.value)}
                      className="w-5 h-5 p-0 border-0 rounded cursor-pointer"
                      title="Segment color"
                    />
                    <button
                      onClick={() => updateSegment(index, "visible", seg.visible === false ? true : false)}
                      className={`p-1 transition-colors ${seg.visible !== false ? "text-gray-600 dark:text-gray-300 hover:text-blue-500" : "text-gray-400 dark:text-gray-600 hover:text-gray-500"}`}
                      title={seg.visible !== false ? "Visible" : "Hidden"}
                    >
                      {seg.visible !== false ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
                    </button>
                    <button
                      onClick={() => addSegment(index)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 transition-colors flex-shrink-0"
                      title="Duplicate segment"
                    >
                      <FaCopy size={13} />
                    </button>
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteSegment(index)}
                  className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Remove segment"
                >
                  <FaTrashAlt size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add segment */}
          <button
            onClick={() => addSegment(-1)}
            className="w-full mt-1 py-1.5 text-sm border-2 border-dashed border-gray-300 dark:border-gray-700 rounded hover:border-blue-400 dark:hover:border-blue-500 text-gray-400 dark:text-gray-500 hover:text-blue-500 flex items-center justify-center gap-1 transition-colors"
          >
            <FaPlus size={11} /> Add Segment
          </button>
        </>
      )}
    </div>
  );
}
