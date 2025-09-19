import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import WinnerPopup from "./WinnerPopup";
import WheelPlayerControls from "./WheelPlayerControls";
const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);


export default function WheelPlayerWrapper(
  winner,
  prizeNumber,
  setWinner,
  segData,
  setSegData,
  setShowCelebration,
  mustSpin,
  setMustSpin,
  showOverlay,
  handleSpinClick,
  data,
  wheelData,
  advancedOptions,
  setPrizeNumber,
  setResultList,
  MAX_SPIN_TIME,
  segTxtfontSize,
  handleToggleFullScreen,
  isFullScreen
) {
  const [showControls, setShowControls] = useState(false);

  // Optional: auto-hide controls after a few seconds on mobile
  useEffect(() => {
    if (showControls && isMobile()) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  const isMobile = () => window.matchMedia("(pointer: coarse)").matches;

  return (
    <div
      className={`bg-card flex flex-col items-center text-card-foreground lg:mb-2 lg:col-span-8 mx-auto transition-all duration-300 ease-in-out ${
        isFullScreen ? "fixed inset-0 z-50 bg-black" : "relative w-full"
      }`}
      onMouseEnter={() => {
        if (!isMobile()) setShowControls(true);
      }}
      onMouseLeave={() => {
        if (!isMobile()) setShowControls(false);
      }}
      onTouchStart={() => {
        if (isMobile()) setShowControls(true);
      }}
    >
      <WinnerPopup
        winner={winner}
        prizeNumber={prizeNumber}
        setWinner={setWinner}
        segData={segData}
        setSegData={setSegData}
        setShowCelebration={setShowCelebration}
        mustSpin={mustSpin}
      />

      {showOverlay && (
        <div
          onClick={handleSpinClick}
          className="z-10 absolute inset-0 flex items-center justify-center rounded-full text-4xl font-bold text-white"
          style={{ textShadow: "2px 2px 0 rgba(0, 0, 0, 0.2)" }}
        >
          Click to Spin
        </div>
      )}

      {/* Wheel container */}
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
          onStopSpinning={() => {
            setMustSpin(false);
            if (advancedOptions) {
              let adjustedWinner = null;
              let j = 0;
              for (let i = 0; i < segData.length; i++) {
                if (segData[i].visible) {
                  if (j === prizeNumber) {
                    adjustedWinner = segData[i];
                    setPrizeNumber(i);
                    break;
                  } else j++;
                }
              }
              setWinner(adjustedWinner);
              setResultList([...resultList, adjustedWinner]);
            } else {
              setWinner(segData[prizeNumber]);
              setResultList([...resultList, segData[prizeNumber]]);
            }
          }}
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

      {/* Controls only when interacting */}
      {showControls && (
        <WheelPlayerControls
          handleSpinClick={handleSpinClick}
          mustSpin={mustSpin}
          handleToggleFullScreen={handleToggleFullScreen}
          isFullScreen={isFullScreen}
        />
      )}
    </div>
  );
}
