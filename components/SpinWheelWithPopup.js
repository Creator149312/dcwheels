import React from "react";

const SpinWheelWithPopup = ({}) => {
  return (
    <div className="bg-card text-card-foreground lg:mb-2 pt-0 lg:col-span-8 mx-auto">
      <WinnerPopup
        winner={winner}
        setWinner={setWinner}
        segData={segData}
        setSegData={setSegData}
        setShowCelebration={setShowCelebration}
        mustSpin={mustSpin}
      />
      <div onClick={handleSpinClick} className="min-h-96 sm:h-[450px]">
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          textDistance={
            65 + segData.length / 8 < 95 ? 60 + segData.length / 8 : 95
          }
          radiusLineWidth={0}
          outerBorderWidth={0}
          outerBorderColor="white"
          onStopSpinning={() => {
            setMustSpin(false);
            setWinner(segData[prizeNumber]);
          }}
          innerRadius={15}
          innerBorderWidth={4}
          innerBorderColor="white"
          fontWeight={"normal"}
          disableInitialAnimation={"false"}
          spinDuration={wheelData.spinDuration}
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
    </div>
  );
};

export default SpinWheelWithPopup;
