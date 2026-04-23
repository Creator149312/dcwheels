"use client";
import { useState } from "react";
import { FaTimes, FaCode, FaCopy, FaCheck } from "react-icons/fa";

export default function EmbedCodePopup({ wheelId, onClose }) {
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState("medium");

  const sizes = {
    small:  { width: 400, height: 450, label: "Small (400×450)" },
    medium: { width: 560, height: 620, label: "Medium (560×620)" },
    large:  { width: 800, height: 860, label: "Large (800×860)" },
  };

  const { width, height } = sizes[size];
  const embedUrl = `https://spinpapa.com/embed/${wheelId}`;
  const iframeCode = `<iframe\n  src="${embedUrl}"\n  width="${width}"\n  height="${height}"\n  style="border:none;border-radius:12px;"\n  allow="autoplay"\n  loading="lazy"\n  title="SpinPapa Wheel"\n></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg px-5 py-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FaCode className="text-indigo-500" />
            Embed this Wheel
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1"
          >
            <FaTimes size={13} />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Paste this code into any website or blog to embed an interactive spin wheel.
        </p>

        {/* Size selector */}
        <div className="flex gap-1.5 mb-3">
          {Object.entries(sizes).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSize(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                size === key
                  ? "bg-indigo-500 text-white border-indigo-500"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 mb-3">
          <pre className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-all font-mono leading-relaxed pr-8">
            {iframeCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-200"
            title="Copy code"
          >
            {copied ? <FaCheck size={11} className="text-green-500" /> : <FaCopy size={11} />}
          </button>
        </div>

        {/* Footer row: preview link + copy button */}
        <div className="flex items-center justify-between">
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline"
          >
            Preview embed ↗
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-xs font-semibold transition"
          >
            {copied ? <FaCheck size={11} /> : <FaCopy size={11} />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
