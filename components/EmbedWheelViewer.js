"use client";
import dynamic from "next/dynamic";
import { useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { useWheelState } from "./useWheelState";
import FireworksConfetti from "@components/FireworksConfetti";
import Link from "next/link";

const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);

export default function EmbedWheelViewer({
  newSegments,
  wheelPresetSettings,
  wheelTitle,
  wheelId,
}) {
  const { wheelData, segData, data, MAX_SPIN_TIME } = useContext(SegmentsContext);

  const {
    mustSpin,
    prizeNumber,
    winner,
    setWinner,
    showCelebration,
    setShowCelebration,
    segTxtfontSize,
    muted,
    setMuted,
    handleSpinClick,
    handleStopSpinning,
  } = useWheelState({ newSegments, wheelPresetSettings, wheelId });

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 select-none overflow-hidden">
      {/* Winner banner */}
      {winner && !mustSpin && (
        <div
          className="w-full text-center py-1 px-4 text-xs font-semibold text-white truncate tracking-wide"
          style={{ backgroundColor: "#6366f1" }}
        >
          🎉 {winner}
          <button
            onClick={() => { setWinner(null); setShowCelebration(false); }}
            className="ml-2 text-white/60 hover:text-white font-normal"
          >
            ✕
          </button>
        </div>
      )}

      {/* Wheel area */}
      <div
        className="flex-1 flex items-center justify-center cursor-pointer"
        onClick={handleSpinClick}
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
            outerBorderColor="white"
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
          />
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-black/85 text-white flex items-center justify-between px-3 py-0.5 text-sm shrink-0">
        {/* Spin button */}
        <button
          onClick={handleSpinClick}
          disabled={mustSpin}
          className="px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold transition"
        >
          {mustSpin ? "Spinning…" : "▶ Spin"}
        </button>

        {/* Powered by SpinPapa */}
        <Link
          href={`https://spinpapa.com/uwheels/${wheelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-white/50 hover:text-white/90 transition"
        >
          ⚡ <span className="font-medium">SpinPapa</span>
        </Link>
      </div>

      {showCelebration && <FireworksConfetti />}
    </div>
  );
}
