"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import WheelPlayerControls from "./WheelPlayerControls";
import { useWheelState } from "./useWheelState";
import { useQuizState } from "./useQuizState";
import { usePathname, useRouter } from "next/navigation";
import { Edit2 } from "lucide-react";

const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);

// Editor + modal — only used on the home page (/). Dynamic imports prevent
// their chunks from being downloaded on /wheels and /uwheels routes at all.
const WheelEditor = dynamic(() => import("./WheelEditor"), { ssr: false });
const WheelEditorModal = dynamic(() => import("./WheelEditorModal"), { ssr: false });

// These components only render AFTER the user spins (winner !== null) or
// when wheelType === "quiz" + winner !== null. None of them affect first
// paint, LCP, or any pre-spin interaction. Lazy-loading them with
// `ssr: false` removes ~15-30KB combined from the initial route bundle on
// every page that mounts the wheel player.
const WinnerPopup = dynamic(() => import("@components/WinnerPopup"), {
  ssr: false,
});
const QuizCard = dynamic(() => import("@components/QuizCard"), {
  ssr: false,
});
// canvas-confetti (~5KB) + the React wrapper. Only mounts when
// showCelebration flips true, which happens post-spin.
const FireworksConfetti = dynamic(
  () => import("@components/FireworksConfetti"),
  { ssr: false }
);

const WheelWithInputContentEditable = ({
  newSegments,
  wheelPresetSettings,
  wheelTypeProp = "basic",
  relatedWheelsSlot,
  wheelId = null,
}) => {
  const { wheelData, segData, setSegData, data, MAX_SPIN_TIME, wheelType } =
    useContext(SegmentsContext);
  const currentPath = usePathname();
  const router = useRouter();

  const quizState = useQuizState();

  const {
    mustSpin,
    prizeNumber,
    setPrizeNumber,
    winner,
    setWinner,
    showCelebration,
    setShowCelebration,
    showOverlay,
    segTxtfontSize,
    muted,
    setMuted,
    handleSpinClick,
    handleStopSpinning,
    saveWheelData,
  } = useWheelState({ newSegments, wheelPresetSettings, wheelTypeProp, wheelId });

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const wheelContainerRef = useRef(null);

  // Theater mode: fullscreen the wheel container only
  const handleToggleFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullScreen(false);
    } else if (wheelContainerRef.current) {
      wheelContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullScreen(true))
        .catch(() => setIsFullScreen((prev) => !prev));
    } else {
      setIsFullScreen((prev) => !prev);
    }
  };

  // Sync fullscreen state when user presses Escape
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullScreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <>
      <div className="grid lg:grid-cols-12 xl:grid-cols-8 gap-x-2 gap-y-1 max-w-7xl mx-auto px-2 mt-2">
        <div
          ref={wheelContainerRef}
          className={`bg-card border shadow-sm flex flex-col items-center text-card-foreground lg:mb-0 lg:col-span-7 xl:col-span-5 mx-auto transition-all duration-300 ease-in-out ${
            isFullScreen
              ? "fixed inset-0 z-50 bg-black rounded-none border-none shadow-none"
              : "relative w-full rounded-2xl overflow-hidden"
          }`}
        >
          {wheelType === "quiz" ? (
            <QuizCard
              segment={winner}
              segmentIndex={prizeNumber}
              totalSegments={segData.filter((s) => s.visible !== false).length}
              quizState={quizState}
              onClose={() => setWinner(null)}
              onReset={() => {
                quizState.resetQuiz();
                setWinner(null);
              }}
            />
          ) : (
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
          )}

          {/* Click to Spin overlay removed for LCP optimization */}

          {/* Wheel */}
          <div
            onClick={handleSpinClick}
            className={`relative flex items-center justify-center w-full ${
              isFullScreen ? "flex-1" : "min-h-[30rem]"
            }`}
          >
            {data.length > 0 && (
            <Wheel
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber >= 0 ? prizeNumber : 0}
              data={(() => {
                const slice = data.slice(
                  0,
                  data.length < wheelData.maxNumberOfOptions
                    ? data.length
                    : wheelData.maxNumberOfOptions
                );
                if (wheelType !== "quiz" || quizState.answeredIndices.size === 0)
                  return slice;
                return slice.map((seg, i) =>
                  quizState.answeredIndices.has(i)
                    ? { ...seg, style: { ...seg.style, backgroundColor: "#6b7280" } }
                    : seg
                );
              })()}
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

            {/* Center Branding Overlay */}
            {(wheelData.centerText || wheelData.centerImage) && wheelData.innerRadius > 0 && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center z-20 pointer-events-none overflow-hidden"
                style={{
                  width: `${wheelData.innerRadius}%`, // Scales perfectly within the inner radius hole
                  aspectRatio: "1 / 1", // Forces it to stay a perfect circle
                  maxWidth: "150px", // Safety limits just in case
                  maxHeight: "150px",
                }}
              >
                {wheelData.centerImage ? (
                  <img
                    src={wheelData.centerImage}
                    alt="Center Design"
                    className="w-full h-full object-cover rounded-full pointer-events-none"
                  />
                ) : (
                  <span className="text-[12px] md:text-sm font-black text-slate-700 uppercase tracking-wide truncate px-1 text-center bg-white w-full h-full flex items-center justify-center rounded-full border-2 border-slate-200 shadow-sm">
                    {wheelData.centerText}
                  </span>
                )}
              </div>
            )}
          </div>

          <WheelPlayerControls
            handleSpinClick={handleSpinClick}
            mustSpin={mustSpin}
            handleToggleFullScreen={handleToggleFullScreen}
            isFullScreen={isFullScreen}
            segData={segData}
            wheelData={wheelData}
            saveWheelData={saveWheelData}
            currentPath={currentPath}
            router={router}
            muted={muted}
            setMuted={setMuted}
          />
        </div>

        {/* Desktop sidebar: related wheels on content pages, full editor on home */}
        {!isFullScreen && (
          <div className="hidden lg:contents">
            {currentPath === "/" ? (
              <WheelEditor
                mustSpin={mustSpin}
                currentPath={currentPath}
                relatedWheelsSlot={relatedWheelsSlot}
                isFullScreen={isFullScreen}
              />
            ) : (
              <aside className="relative bg-card text-card-foreground border shadow-sm lg:col-span-5 xl:col-span-3 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 overflow-y-auto p-3">
                  {relatedWheelsSlot}
                </div>
              </aside>
            )}
          </div>
        )}

        {/* Mobile: Edit Wheel button + modal — home page only */}
        {currentPath === "/" && (
          <>
            <div className="lg:hidden w-full pt-1 pb-4">
              <button
                onClick={() => setIsEditorOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                <Edit2 size={20} strokeWidth={2.5} />
                Edit Wheel Items
              </button>
            </div>

            <WheelEditorModal
              isOpen={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              mustSpin={mustSpin}
              currentPath={currentPath}
              relatedWheelsSlot={relatedWheelsSlot}
            />
          </>
        )}
      </div>
      {showCelebration && <FireworksConfetti />}
    </>
  );
};

export default WheelWithInputContentEditable;
