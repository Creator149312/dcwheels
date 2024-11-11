'use client'
import ContentEditableDiv from '@components/ContentEditableDiv';
import WinnerPopup from '@components/WinnerPopup';
import React, { useState, useRef } from 'react'
import { Wheel } from 'react-custom-roulette'
import FireworksConfetti from "@components/FireworksConfetti";
import ImageUploadAsSegment from '@components/ImageUploadAsSegment';

const processString = (str) => {
  const first15Chars = str.substring(0, 15); // Get the first 15 characters
  let variableValue = 36;

  if (str.length > 10) {
    variableValue -= (str.length - 10) * 3; // Decrease by 3 for each character beyond 10
    variableValue = Math.max(variableValue, 0); // Ensure it doesn't go below 0
  }

  return {
    first15Chars,
    variableValue
  };
}

const prepareData = (segData, colData, maxlengthOfSegmentText) => {
  const result = [];
  const colDataLength = colData.length;
  for (let i = 0; i < segData.length; i++) {
    const seg = segData[i];
    const colIndex = i % colDataLength;
    const col = colData[colIndex];

    if (seg.includes('<img')) {
      const regex = /src="([^"]+)"/;
      const imgUrl = regex.exec(seg)[1];
      result.push({
        option: seg,
        style: { backgroundColor: col },
        image: { uri: imgUrl, sizeMultiplier: 0.5 },
      });
    } else {
      result.push({
        option: seg.substring(0, maxlengthOfSegmentText) + (seg.length > maxlengthOfSegmentText ? ".." : ''),
        style: { backgroundColor: col },
      });
    }
  }
  return result;
};

const segTempData = ["Eighty-nine", "Ninety", "Ninety-one", "Ninety-two", "Ninety-three", "Ninety-four", "Ninety-five", "Ninety-six", "Ninety-seven", "Ninety-eight", "Ninety-nine", "One hundred", "Sources and related content", "Ram", "Paul", "Siya", "Duke", `<img src="/spin-wheel-logo.png" alt="logo" />`, `<img  src="/spin-wheel-logo.png" alt="logo" />`];
const segColors = [
  "#EE4040",
  "#F0CF50",
  "#815CD1",
  "#3DA5E0",
  "#34A24F",
  "#F9AA1F",
  "#EC3F3F",
  "#FF9000",
];

export default () => {
  const maxSpinDuration = 0.90;
  const minSpinDuration = 0.15;
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [segData, setSegData] = useState(segTempData);
  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  let maxlengthOfSegmentText = Math.min(
    segData.reduce((acc, word) => {
      return word.length > acc.length ? word : acc;
    }, "").length,
    18)
    ;

  let segTxtfontSize =
    Math.min(
      ((36 + (segData.length / 8)) * Math.PI * Math.PI) /
      Math.max(segData.length, maxlengthOfSegmentText),
      48
    );

  let data = prepareData(segData, segColors, maxlengthOfSegmentText);

  const handleSpinClick = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
      // setShowCelebration(false);
    }
  }

  useEffect(() => {
    data = prepareData(segData, segColors, maxlengthOfSegmentText);
  }, [segData]);

  return (<>
    <div className="grid lg:grid-cols-12 gap-x-2">
      <div className="bg-card text-card-foreground lg:mb-2 pt-0 lg:col-span-8 mx-auto">
        <WinnerPopup winner={winner} setWinner={setWinner} segData={segData} setSegData={setSegData} />
        <div onClick={handleSpinClick}>
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={data}
            textDistance={(60 + (segData.length / 8)) < 95 ? (60 + (segData.length / 8)) : 95}
            radiusLineWidth={0}
            outerBorderWidth={2}
            onStopSpinning={() => {
              setMustSpin(false);
              setWinner(segData[prizeNumber]);
              setShowCelebration(true);
            }}
            fontWeight={'normal'}
            disableInitialAnimation='true'
            spinDuration={Math.random() * (maxSpinDuration - minSpinDuration) + minSpinDuration}
            fontSize={segTxtfontSize}
            pointerProps={{
              src: '/pointer.png',
              style: {
                transform: 'rotate(50deg)',
                right: '15px',
                top: '28px'
              }
            }}
          />
        </div>
      </div>
      <div className="bg-card text-card-foreground mx-3 lg:p-2 lg:mx-1 lg:my-2 lg:col-span-4">
        <ContentEditableDiv segData={segData} setSegData={setSegData} />
        {showCelebration && <FireworksConfetti />}
      </div>
    </div>
  </>
  )
}