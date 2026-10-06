"use client";
import dynamic from "next/dynamic";
import { useContext, useEffect } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { useWheelState } from "./useWheelState";
import Link from "next/link";

const FireworksConfetti = dynamic(
  () => import("@components/FireworksConfetti"),
  { ssr: false }
);

const WinnerPopup = dynamic(() => import("@components/WinnerPopup"), {
  ssr: false,
});

// Use the new high-quality SpinWheelCanvas instead of react-custom-roulette
const Wheel = dynamic(() => import("./SpinWheelCanvas"), {
  ssr: false,
});

export default function EmbedWheelViewer({
  newSegments,
  wheelPresetSettings,
  wheelTitle,
  wheelId,
}) {
  const { wheelData, segData, data, MAX_SPIN_TIME, setSegData } = useContext(SegmentsContext);

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

  // Auto-resize: post the document height to the parent window so the host
  // page's message listener can adjust the iframe height seamlessly.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const postHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "wheel-resize", height }, "*");
    };

    postHeight();

    const ro = new ResizeObserver(postHeight);
    ro.observe(document.body);
    window.addEventListener("resize", postHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", postHeight);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background select-none overflow-hidden">
      {/* Winner Popup Modal — same as main app */}
      <WinnerPopup
        winner={winner}
        prizeNumber={prizeNumber}
        setWinner={setWinner}
        segData={segData}
        setSegData={setSegData}
        setShowCelebration={setShowCelebration}
        mustSpin={mustSpin}
        wheelId={wheelId}
      />

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
            backgroundColors={data.map(
              (d) => d?.style?.backgroundColor || "#EE4040"
            )}
            textColors={["#000000"]}
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
          href={`https://spinpapa.com/wheels/${wheelId}`}
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
