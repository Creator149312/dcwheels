"use client";
import { useContext, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SegmentsContext } from "@app/SegmentsContext";
import { useWheelState } from "./useWheelState";
const FireworksConfetti = dynamic(
  () => import("@components/FireworksConfetti"),
  { ssr: false }
);

const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);

/**
 * StreamingWheelViewer
 *
 * Designed as an OBS Browser Source overlay.
 *
 * Key differences vs EmbedWheelViewer:
 *  - Fully transparent background (no bg-white / bg-gray-950).
 *  - Zero UI chrome: no bottom bar, no branding strip, no winner banner.
 *  - Spacebar OR clicking the wheel triggers a spin.
 *  - Winner is shown as a large centred floating card that auto-dismisses
 *    after 4 s (configurable via autoRemoveMs prop).
 *  - Supports ?autoremove=1 URL flag handled by parent page.
 */
export default function StreamingWheelViewer({
  newSegments,
  wheelPresetSettings,
  wheelId,
  autoRemove = false,
  autoRemoveMs = 4000,
}) {
  const { wheelData, segData, data, MAX_SPIN_TIME } =
    useContext(SegmentsContext);

  const {
    mustSpin,
    prizeNumber,
    winner,
    setWinner,
    showCelebration,
    setShowCelebration,
    segTxtfontSize,
    muted,
    handleSpinClick,
    handleStopSpinning,
  } = useWheelState({ newSegments, wheelPresetSettings, wheelId });

  const [showWinner, setShowWinner] = useState(false);
  const dismissTimer = useRef(null);

  // Show winner card when winner is set
  useEffect(() => {
    if (winner && !mustSpin) {
      setShowWinner(true);
      if (autoRemove) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
          setShowWinner(false);
          setWinner(null);
          setShowCelebration(false);
        }, autoRemoveMs);
      }
    }
    return () => clearTimeout(dismissTimer.current);
  }, [winner, mustSpin, autoRemove, autoRemoveMs, setWinner, setShowCelebration]);

  // Spacebar to spin
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleSpinClick();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSpinClick]);

  const dismissWinner = () => {
    clearTimeout(dismissTimer.current);
    setShowWinner(false);
    setWinner(null);
    setShowCelebration(false);
  };

  return (
    /*
     * The outer div is intentionally style="background:transparent" rather
     * than a Tailwind class, because OBS Browser Source reads the actual
     * computed background value. Tailwind's bg-transparent applies correctly
     * but an inline style guarantees OBS sees it even if Tailwind purges it.
     */
    <div
      className="relative flex items-center justify-center w-screen h-screen select-none overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Wheel — clicking anywhere on it spins */}
      <div
        className="cursor-pointer"
        onClick={handleSpinClick}
        title="Click or press Space to spin"
      >
        {data.length > 0 && (
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber >= 0 ? prizeNumber : 0}
            data={data.slice(
              0,
              data.length < wheelData.maxNumberOfOptions
                ? data.length
                : wheelData.maxNumberOfOptions
            )}
            textDistance={Math.min(60 + 0.5 * segData.length, 72)}
            radiusLineWidth={0}
            outerBorderWidth={0}
            outerBorderColor="transparent"
            onStopSpinning={handleStopSpinning}
            innerRadius={wheelData.innerRadius}
            innerBorderWidth={4}
            innerBorderColor="white"
            fontWeight="normal"
            spinDuration={wheelData.spinDuration / MAX_SPIN_TIME}
            fontSize={segTxtfontSize}
            pointerProps={{
              src: "/smallredpointer.png",
              style: {
                transform: "rotate(50deg)",
                right: "15px",
                top: "28px",
                scale: "60%",
              },
            }}
            backgroundColors={data.map((d) => d.option?.color ?? d.style?.backgroundColor ?? "#6366f1")}
          />
        )}
      </div>

      {/* Floating winner card — centred, semi-opaque, auto-dismisses */}
      {showWinner && winner && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 50 }}
        >
          <div
            className="pointer-events-auto flex flex-col items-center gap-3 rounded-3xl px-10 py-7 shadow-2xl animate-fade-in-scale"
            style={{
              background: "rgba(15, 10, 40, 0.82)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1.5px solid rgba(255,255,255,0.15)",
              maxWidth: "min(520px, 85vw)",
            }}
          >
            <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
              Winner
            </p>
            <p
              className="text-white font-bold text-center leading-tight"
              style={{ fontSize: "clamp(1.5rem, 5vw, 3rem)" }}
            >
              {winner}
            </p>
            {!autoRemove && (
              <button
                onClick={dismissWinner}
                className="mt-1 px-6 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm transition"
              >
                Dismiss
              </button>
            )}
            {autoRemove && (
              <p className="text-white/40 text-xs">
                Auto-dismissing…
              </p>
            )}
          </div>
        </div>
      )}

      {showCelebration && <FireworksConfetti />}
    </div>
  );
}
