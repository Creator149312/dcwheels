"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import WinnerPopup from "@components/WinnerPopup";
import QuizCard from "@components/QuizCard";
import FireworksConfetti from "@components/FireworksConfetti";
import WheelPlayerControls from "./WheelPlayerControls";
import WheelEditor from "./WheelEditor";
import { useWheelState } from "./useWheelState";
import { useQuizState } from "./useQuizState";
import { usePathname, useRouter } from "next/navigation";
const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);

const WheelWithInputContentEditable = ({
  newSegments,
  wheelPresetSettings,
  relatedWheels,
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
  } = useWheelState({ newSegments, wheelPresetSettings });

  const [isFullScreen, setIsFullScreen] = useState(false);
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
      <div className="grid lg:grid-cols-12 gap-x-6 gap-y-4 max-w-7xl mx-auto px-4 mt-6">
        <div
          ref={wheelContainerRef}
          className={`bg-card border shadow-sm flex flex-col items-center text-card-foreground lg:mb-0 lg:col-span-7 xl:col-span-8 mx-auto transition-all duration-300 ease-in-out ${
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
            />
          )}

          {showOverlay && (
            <div
              onClick={handleSpinClick}
              className="z-10 absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
            >
              <span
                className="text-4xl font-bold text-white animate-pulse drop-shadow-lg select-none"
                style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)" }}
              >
                🎯 Click to Spin
              </span>
            </div>
          )}

          {/* Wheel */}
          <div
            onClick={handleSpinClick}
            className={`flex items-center justify-center w-full ${
              isFullScreen ? "flex-1" : "min-h-[24rem]"
            }`}
          >
            <Wheel
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
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

        <WheelEditor
          mustSpin={mustSpin}
          currentPath={currentPath}
          relatedWheels={relatedWheels}
          isFullScreen={isFullScreen}
        />
      </div>
      {showCelebration && <FireworksConfetti />}
    </>
  );
};

export default WheelWithInputContentEditable;
