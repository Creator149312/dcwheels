"use client";
import dynamic from 'next/dynamic';
import { useState, useEffect, useContext } from "react";
import ContentEditableDiv from "@components/ContentEditableDiv";
import WinnerPopup from "@components/WinnerPopup";
// import { Wheel } from "react-custom-roulette";  
// we are not using above import because it causes ReferenceError: window is not defined , workaround is the following import
const Wheel = dynamic(() => import('react-custom-roulette').then((mod) => mod.Wheel), { ssr: false, });
import FireworksConfetti from "@components/FireworksConfetti";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import SaveWheelBtn from "./SaveWheelBtn";
import { useSession } from "next-auth/react";
import ContentEditableDivResult from "./ContentEditableDivResult";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";

const processString = (str) => {
  const first15Chars = str.substring(0, 15); // Get the first 15 characters
  let variableValue = 36;

  if (str.length > 10) {
    variableValue -= (str.length - 10) * 3; // Decrease by 3 for each character beyond 10
    variableValue = Math.max(variableValue, 0); // Ensure it doesn't go below 0
  }

  return {
    first15Chars,
    variableValue,
  };
};

const prepareData = (segData, colData, maxlengthOfSegmentText) => {
  const result = [];
  const colDataLength = colData.length;
  for (let i = 0; i < segData.length; i++) {
    const seg = segData[i];
    const colIndex = i % colDataLength;
    const col = colData[colIndex];

    if (seg.includes("<img")) {
      const regex = /src="([^"]+)"/;
      const imgUrl = regex.exec(seg)[1];
      result.push({
        option: seg,
        style: { backgroundColor: col },
        image: { uri: imgUrl, sizeMultiplier: 0.5 },
      });
    } else {
      result.push({
        option:
          seg.substring(0, maxlengthOfSegmentText) +
          (seg.length > maxlengthOfSegmentText ? ".." : ""),
        style: { backgroundColor: col },
      });
    }
  }
  return result;
};

// const segTempData = ["Eighty-nine", "Ninety", "Ninety-one", "Ninety-two", "Ninety-three", "Ninety-four", "Ninety-five", "Ninety-six", "Ninety-seven", "Ninety-eight", "Ninety-nine", "One hundred", "Sources and related content", "Ram", "Paul", "Siya", "Duke", `<img src="/spin-wheel-logo.png" alt="logo" />`, `<img  src="/spin-wheel-logo.png" alt="logo" />`];
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

const WheelWithInputContentEditable = ({ newSegments }) => {
  const maxSpinDuration = 0.9;
  const minSpinDuration = 0.35;
  const {resultList, setResultList} = useContext(SegmentsContext);
  const [mustSpin, setMustSpin] = useState(false);
  // const [resultList, setResultList] = useState([]);

  const { status, data: session } = useSession();
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [segData, setSegData] = useState(newSegments);
  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  let maxlengthOfSegmentText = Math.min(
    segData.reduce((acc, word) => {
      return word.length > acc.length ? word : acc;
    }, "").length,
    15
  );
  let segTxtfontSize = Math.min(
    (32 * Math.PI * Math.PI) / Math.max(segData.length, maxlengthOfSegmentText),
    42
  );

  let data = prepareData(segData, segColors, maxlengthOfSegmentText);

  const handleSpinClick = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
      // setShowCelebration(false);
    }
  };

  useEffect(() => {
    data = prepareData(segData, segColors, maxlengthOfSegmentText);
  }, [segData]);

  useEffect(() => {
    if (winner !== "" && winner !== undefined) {
      setResultList([...resultList, winner]);
    }
  }, [winner]);

  return (
    <>
      <div className="grid lg:grid-cols-12 gap-x-2">
        <div className="bg-card text-card-foreground lg:mb-2 pt-0 lg:col-span-8 mx-auto">
          <WinnerPopup
            winner={winner}
            setWinner={setWinner}
            segData={segData}
            setSegData={setSegData}
            setShowCelebration={setShowCelebration}
          />
          <div onClick={handleSpinClick} className='min-h-96 sm:h-[450px]'>
            <Wheel
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
              data={data}
              textDistance={
                60 + segData.length / 8 < 95 ? 60 + segData.length / 8 : 95
              }
              radiusLineWidth={0}
              outerBorderWidth={0}
              outerBorderColor='white'
              onStopSpinning={() => {
                setMustSpin(false);
                setWinner(segData[prizeNumber]);
                // setShowCelebration(true);
              }}
              innerRadius={15}
              innerBorderWidth={4}
              innerBorderColor='white'
              fontWeight={"normal"}
              disableInitialAnimation="true"
              spinDuration={
                Math.random() * (maxSpinDuration - minSpinDuration) +
                minSpinDuration
              }
              fontSize={segTxtfontSize}
              pointerProps={{
                src: "/smallredpointer.png",
                style: {
                  transform: "rotate(50deg)",
                  right: "15px",
                  top: "28px",
                  scale: '60%'
                },
              }}
            />
          </div>
        </div>
        <div className="bg-card text-card-foreground mx-3 lg:p-2 lg:mx-1 lg:col-span-4 shadow-md">
          <Tabs defaultValue="list">
            <TabsList className="w-full">
              <TabsTrigger value="list">
                List <span className="ml-2">{segData.length}</span>
              </TabsTrigger>
              <TabsTrigger value="result">
                Result
                <span className="ml-2">
                  {resultList.length === 0 ? 0 : resultList.length}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <ContentEditableDiv segData={segData} setSegData={setSegData} />
            </TabsContent>
            <TabsContent value="result">
              <ContentEditableDivResult resultList={resultList} />
            </TabsContent>
          </Tabs>
          <div>
            {session !== null ? (
              <SaveWheelBtn segmentsData={segData}/>
            ) : (
              <p className="my-2 flex justify-center items-center">
                <a href="/register">
                  <Button className="mx-2" size={"lg"} variant={"default"}>
                    Register Here
                  </Button>
                </a>
                to Save Your Wheels
              </p>
            )}
          </div>
          {showCelebration && <FireworksConfetti />}
        </div>
      </div>
    </>
  );
};

export default WheelWithInputContentEditable;
