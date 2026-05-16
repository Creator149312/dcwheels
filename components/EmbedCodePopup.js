"use client";
import { useState } from "react";
import { X, Code2, Copy, Check } from "lucide-react";

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
        className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-lg px-5 py-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Code2 className="text-indigo-500" size={16} />
            Embed this Wheel
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition p-1"
          >
            <X size={13} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
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
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative bg-muted border border-border rounded-lg px-3 py-2.5 mb-3">
          <pre className="text-xs text-foreground whitespace-pre-wrap break-all font-mono leading-relaxed pr-8">
            {iframeCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1 rounded bg-background border border-border hover:bg-muted transition text-foreground"
            title="Copy code"
          >
            {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
          </button>
        </div>

        {/* Footer row: preview link + copy button */}
        <div className="flex items-center justify-between">
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Preview embed ↗
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-xs font-semibold transition"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
