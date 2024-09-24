'use client'
import ContentEditableDiv from '@components/ContentEditableDiv';
import WinnerPopup from '@components/WinnerPopup';
import React, { useState, useRef } from 'react'
import { Wheel } from 'react-custom-roulette'
import FireworksConfetti from "@components/FireworksConfetti";
import ImageUploadAsSegment from '@components/ImageUploadAsSegment';

const prepareData = (segData, colData) => {
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
        textDistance: 10
      });
    } else {
      result.push({
        option: seg,
        style: { backgroundColor: col },
        textDistance: 10
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
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [segData, setSegData] = useState(segTempData);
  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  const data = prepareData(segData, segColors);

  const handleSpinClick = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
      // setShowCelebration(false);
    }
  }

  return (<>
  <div className="grid lg:grid-cols-12 gap-x-2">
    <div className="bg-card text-card-foreground lg:mb-2 pt-0 lg:col-span-8 mx-auto">
    <WinnerPopup winner={winner} setWinner={setWinner} />
    <div onClick={handleSpinClick}>
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={data}
        radiusLineWidth={2}
        onStopSpinning={() => {
          setMustSpin(false);
          setWinner(segData[prizeNumber]);
          setShowCelebration(true);
        }}
        fontWeight={'normal'}
        spinDuration={Math.max(0.15, prizeNumber/ segData.length)}
        fontSize={Math.min(20, 20 * 20/ segData.length)}
        pointerProps={{
          src: '/pointer.png',
          style: {
            transform: 'rotate(50deg)',
            right: '15px',
            top: '28px'
          }
        }}
      />
      {/* <button onClick={handleSpinClick}>SPIN</button> */}
    </div>
    </div>
    <div className="bg-card text-card-foreground mx-3 lg:p-2 lg:mx-1 lg:my-2 lg:col-span-4">
      <h1> This content Editable Divs following </h1>
   
    <ContentEditableDiv segData={segData} setSegData={setSegData}/>
    {showCelebration  && <FireworksConfetti />}
    </div>
    </div>
  </>
  )
}