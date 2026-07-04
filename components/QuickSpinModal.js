"use client";

import { useRef, useState } from "react";
import { X, Zap } from "lucide-react";

const COLORS = [
  "#FF0F55", // Red/Pink
  "#00A8E8", // Cyan
  "#833AB4", // Purple
  "#FF6A00", // Orange
  "#10B981", // Emerald
  "#F59E0B", // Amber
];

/**
 * QuickSpinModal — lightweight spin wheel popup for poll posts.
 *
 * Opens over the feed in a modal, renders a CSS conic-gradient wheel,
 * and lets the user manually trigger a spin to pick an option.
 */
export default function QuickSpinModal({ options, title, onClose }) {
  const rotationRef = useRef(0);
  const [displayRotation, setDisplayRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);

  const n = options.length;
  const segmentAngle = 360 / n;

  // Build conic-gradient from the poll options
  const gradientStops = options.map((_, idx) => {
    const start = idx * segmentAngle;
    const end = (idx + 1) * segmentAngle;
    return `${COLORS[idx % COLORS.length]} ${start}deg ${end}deg`;
  });
  const gradient = `conic-gradient(from 0deg, ${gradientStops.join(", ")})`;

  const handleSpin = () => {
    if (spinning) return;
    setWinner(null);
    setSpinning(true);

    // 5 full rotations + random landing offset
    const extraDeg = Math.floor(Math.random() * 360);
    const totalRotation = rotationRef.current + 360 * 5 + extraDeg;
    rotationRef.current = totalRotation;
    setDisplayRotation(totalRotation);

    setTimeout(() => {
      // Pointer sits at top (0°). Determine which segment landed under it.
      const normalised = totalRotation % 360;
      const pointerPos = (360 - normalised + 360) % 360;
      const winnerIdx = Math.floor(pointerPos / segmentAngle) % n;
      setWinner(options[winnerIdx]);
      setSpinning(false);
    }, 3200); // 200ms buffer after the 3s CSS transition
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div>
            <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">
              Spin to Decide
            </p>
            <h3 className="font-bold text-foreground text-sm line-clamp-2">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Wheel + Controls */}
        <div className="flex flex-col items-center gap-5 px-6 py-6">
          {/* Pointer + Wheel container */}
          <div className="relative">
            {/* Pointer triangle at top */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0"
              style={{
                borderLeft: "9px solid transparent",
                borderRight: "9px solid transparent",
                borderTop: "20px solid hsl(var(--foreground))",
              }}
            />

            {/* The wheel */}
            <div
              className="w-64 h-64 rounded-full relative shadow-xl"
              style={{
                background: gradient,
                transform: `rotate(${displayRotation}deg)`,
                transition: "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)",
              }}
            >
              {/* Segment text labels */}
              {options.map((opt, idx) => {
                const angleDeg = idx * segmentAngle + segmentAngle / 2;
                const rad = (angleDeg * Math.PI) / 180;
                const r = 88;
                const x = 128 + r * Math.sin(rad);
                const y = 128 - r * Math.cos(rad);

                return (
                  <span
                    key={opt._id || idx}
                    className="absolute text-white font-black text-[10px] leading-tight text-center pointer-events-none"
                    style={{
                      left: x,
                      top: y,
                      width: "66px",
                      transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {opt.text}
                  </span>
                );
              })}

              {/* Center cap */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-card border-4 border-background shadow-lg" />
              </div>
            </div>
          </div>

          {/* Spin button */}
          {!winner && (
            <button
              onClick={handleSpin}
              disabled={spinning}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Zap size={15} />
              {spinning ? "Spinning…" : "Spin!"}
            </button>
          )}

          {/* Winner reveal */}
          {winner && !spinning && (
            <div className="w-full text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-4 mb-3">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5">
                  The wheel decided
                </p>
                <p className="font-black text-foreground text-xl leading-snug">
                  {winner.text}
                </p>
              </div>
              <button
                onClick={handleSpin}
                className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-2"
              >
                Spin again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
