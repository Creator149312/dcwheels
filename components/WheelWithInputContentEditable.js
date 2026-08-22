"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import WheelPlayerControls from "./WheelPlayerControls";
import { useWheelState } from "./useWheelState";
import { useQuizState } from "./useQuizState";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Edit2, X } from "lucide-react";

const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);

// Editor + modal — used on home page (/) and wheel creation (/wheels/create). 
// Dynamic imports prevent their chunks from being downloaded on /wheels and 
// /uwheels routes at all.
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
// Custom canvas-based fireworks overlay. Only mounts when
// showCelebration flips true, which happens post-spin.
const FireworksConfetti = dynamic(
  () => import("@components/FireworksConfetti"),
  { ssr: false }
);

const WheelWithInputContentEditable = ({
  newSegments,
  wheelPresetSettings,
  wheelTitle: pageWheelTitle,
  wheelPreview: pageWheelPreview,
  wheelTypeProp = "basic",
  relatedWheelsSlot,
  wheelId = null,
}) => {
  const { wheelData, segData, setSegData, data, MAX_SPIN_TIME, wheelType } =
    useContext(SegmentsContext);
  const currentPath = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const quizState = useQuizState();

  const isWheelsCreatePage = currentPath === "/wheels/create";

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
  } = useWheelState({ newSegments, wheelPresetSettings, wheelTypeProp, wheelId, wheelTitle: pageWheelTitle });

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const wheelContainerRef = useRef(null);

  // Auto-open editor modal on mobile ONLY when explicitly requested via ?edit=true parameter
  useEffect(() => {
    if (isEditMode) {
      setIsEditorOpen(true);
    }
  }, [isEditMode]);

  // Auto-open editor modal on mobile if edit=true is present
  useEffect(() => {
    if (isEditMode) {
      setIsEditorOpen(true);
    }
  }, [isEditMode]);

  // Theater mode: fullscreen the wheel container only (with iOS/Safari vendor fallbacks)
  const handleToggleFullScreen = () => {
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc) return;

    const fsEl =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (fsEl) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => setIsFullScreen(false));
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullScreen(false);
    } else if (wheelContainerRef.current) {
      const el = wheelContainerRef.current;
      const requestFs =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;

      if (requestFs) {
        try {
          const promise = requestFs.call(el);
          if (promise && typeof promise.then === "function") {
            promise
              .then(() => setIsFullScreen(true))
              .catch(() => setIsFullScreen(true)); // Fallback to CSS theater mode if browser denies native FS
          } else {
            setIsFullScreen(true);
          }
        } catch {
          setIsFullScreen(true); // Pseudo-fullscreen fallback
        }
      } else {
        setIsFullScreen((prev) => !prev); // Pseudo-fullscreen for iOS Safari / WebViews
      }
    } else {
      setIsFullScreen((prev) => !prev);
    }
  };

  // Sync fullscreen state when user presses Escape or enters/exits native fullscreen
  useEffect(() => {
    const onFsChange = () => {
      const doc = document;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullScreen(isFs);
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100);
    };

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
    };
  }, []);

  // Force roulette canvas re-measurement whenever fullscreen toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullScreen]);

  return (
    <>
      <div className="grid lg:grid-cols-12 xl:grid-cols-8 gap-x-2 gap-y-1 max-w-7xl mx-auto px-0 sm:px-2 mt-2">
        <div
          ref={wheelContainerRef}
          className={`bg-card border shadow-sm flex flex-col items-center text-card-foreground lg:mb-0 lg:col-span-7 xl:col-span-5 mx-auto transition-all duration-300 ease-in-out ${
            isFullScreen
              ? "fixed inset-0 z-50 bg-slate-950 text-white rounded-none border-none shadow-none justify-between p-3 sm:p-6"
              : "relative w-full rounded-2xl overflow-hidden"
          }`}
        >
          {wheelType === "quiz" ? (
            <QuizCard
              segment={winner}
              segmentIndex={prizeNumber}
              totalSegments={(segData || []).filter((s) => s?.visible !== false).length}
              quizState={quizState}
              setSegData={setSegData}
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
              wheelPreview={pageWheelPreview}
            />
          )}

          {/* Click to Spin overlay removed for LCP optimization */}

          {/* Wheel */}
          <div
            onClick={handleSpinClick}
            className={`relative flex items-center justify-center overflow-hidden ${
              isFullScreen
                ? "flex-1 w-full h-full max-h-[85vh] max-w-[85vh] aspect-square mx-auto my-auto"
                : "w-full min-h-[280px] sm:min-h-[27rem]"
            }`}
          >
            {Array.isArray(data) && data.length > 0 && (
            <Wheel
              key={isFullScreen ? "fullscreen-wheel" : "normal-wheel"}
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber >= 0 ? prizeNumber : 0}
              data={(() => {
                const maxOpts = wheelData?.maxNumberOfOptions || 100;
                const slice = data.slice(
                  0,
                  data.length < maxOpts ? data.length : maxOpts
                );
                if (wheelType !== "quiz" || quizState.answeredIndices.size === 0)
                  return slice;
                return slice.map((seg, i) =>
                  quizState.answeredIndices.has(i)
                    ? { ...seg, style: { ...seg?.style, backgroundColor: "#6b7280" } }
                    : seg
                );
              })()}
              textDistance={Math.min(60 + 0.5 * (segData?.length || 0), 72)}
              radiusLineWidth={0}
              outerBorderWidth={0}
              outerBorderColor="white"
              onStopSpinning={handleStopSpinning}
              innerRadius={wheelData?.innerRadius ?? 0}
              innerBorderWidth={4}
              innerBorderColor="white"
              fontWeight="normal"
              spinDuration={(wheelData?.spinDuration || 5) / (MAX_SPIN_TIME || 5)}
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

            {/* Center Branding Overlay */}
            {(wheelData.centerText || wheelData.centerImage) && wheelData.innerRadius > 0 && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center z-20 pointer-events-none overflow-hidden"
                style={{
                  width: `${wheelData.innerRadius}%`, // Scales perfectly within the inner radius hole
                  aspectRatio: "1 / 1", // Forces it to stay a perfect circle
                  maxWidth: isFullScreen ? "260px" : "150px", // Expands with larger wheel in fullscreen
                  maxHeight: isFullScreen ? "260px" : "150px",
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
            onEditClick={() => setIsEditorOpen(true)}
            isEditingActive={currentPath === "/" || isWheelsCreatePage || isEditMode}
          />
        </div>

        {/* Desktop sidebar: related wheels on content pages, full editor on home/wheels/create or if edit=true. Hidden on mobile. */}
        {!isFullScreen && (
          <div className="hidden lg:contents">
            {(currentPath === "/" || isWheelsCreatePage || isEditMode) ? (
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

        {/* Mobile: Fullscreen Editor Overlay — home page, wheels/create, or if edit=true */}
        {!isFullScreen && (currentPath === "/" || isWheelsCreatePage || isEditMode) && (
          <WheelEditorModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            mustSpin={mustSpin}
            currentPath={currentPath}
            relatedWheelsSlot={relatedWheelsSlot}
          />
        )}
      </div>
      {showCelebration && <FireworksConfetti />}
    </>
  );
};

export default WheelWithInputContentEditable;
