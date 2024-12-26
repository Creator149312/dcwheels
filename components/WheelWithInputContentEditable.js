"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useContext } from "react";
import ContentEditableDiv from "@components/ContentEditableDiv";
import WinnerPopup from "@components/WinnerPopup";
// import { Wheel } from "react-custom-roulette";
// we are not using above import because it causes ReferenceError: window is not defined , workaround is the following import
const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);
import FireworksConfetti from "@components/FireworksConfetti";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { useSession } from "next-auth/react";
import ContentEditableDivResult from "./ContentEditableDivResult";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import SaveImportComponent from "./SaveImportComponent";
import ScrollableSegmentsEditor from "./ScrollableSegmentsEditor";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Settings from "./Settings";
import { AiOutlineClose, AiOutlineFullscreen } from "react-icons/ai"; // Import the necessary icons
import Tooltip from "./Tooltip";

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
        optionSize: 1,
      });
    } else {
      result.push({
        option:
          seg.substring(0, maxlengthOfSegmentText) +
          (seg.length > maxlengthOfSegmentText ? ".." : ""),
        style: { backgroundColor: col },
        optionSize: 1,
      });
    }
  }

  return result.length > 0
    ? result
    : [
        {
          option: "Options",
          style: { backgroundColor: "#EE4040" },
        },
      ];
};

const WheelWithInputContentEditable = ({ newSegments }) => {
  const { resultList, setResultList, wheelData, data, setData } =
    useContext(SegmentsContext);
  const [mustSpin, setMustSpin] = useState(false);
  const { status, data: session } = useSession();
  // using the following prizeNumber causes error due to newSegments when wheel is imported.
  // const [prizeNumber, setPrizeNumber] = useState( Math.floor(Math.random() * newSegments.length));

  const [prizeNumber, setPrizeNumber] = useState(0);
  const [segData, setSegData] = useState(newSegments);
  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  const [advancedOptions, setadvancedOptions] = useState(false);

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

  const handleSpinClick = () => {
    if (!mustSpin) {
      setMustSpin(true);
      // setShowCelebration(false);

      let newPrizeNumber = advancedOptions
        ? pickRandomWinner()
        : Math.floor(Math.random() * data.length);
      // console.log("Prize Number = ", newPrizeNumber);
      setPrizeNumber(newPrizeNumber);
    }
  };

  // Function to pick a random element based on weights
  const pickRandomWinner = () => {
    const totalWeight = data.reduce(
      (sum, element) => sum + parseInt(element.optionSize),
      0
    );
    // console.log("Total Weight = ", totalWeight);

    // Generate a random number between 0 and totalWeight
    const randomValue = Math.floor(Math.random() * totalWeight);

    let cumulativeWeight = 0;
    for (let i = 0; i < data.length; i++) {
      cumulativeWeight += parseInt(data[i].optionSize);
      if (randomValue < cumulativeWeight) {
        // console.log(`${randomValue} and ${cumulativeWeight} and ${i}`);
        return i;
      }
    }
  };

  useEffect(() => {
    setPrizeNumber(Math.floor(Math.random() * newSegments.length));
    setData(prepareData(segData, wheelData.segColors, maxlengthOfSegmentText));
    // setadvancedOptions(true);
  }, []);

  useEffect(() => {
    // console.log("Updating Data with colors ", wheelData.segColors);
    // console.log("Updating Data with spinduration ", wheelData.spinDuration);
    if (!advancedOptions)
      setData(
        prepareData(segData, wheelData.segColors, maxlengthOfSegmentText)
      );
  }, [segData, wheelData]);

  useEffect(() => {
    if (winner !== "" && winner !== undefined) {
      setResultList([...resultList, winner]);
    }
  }, [winner]);

  const [isVisible, setIsVisible] = useState(true); // state to control visibility

  const toggleVisibility = () => {
    setIsVisible((prevState) => !prevState); // toggle the state between true and false
  };

  const [isFullScreen, setIsFullScreen] = useState(false);

  // Function to handle toggling full screen mode
  const handleToggle = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Function to handle canceling full screen mode
  const handleCancel = () => {
    setIsFullScreen(false);
  };

  return (
    <>
      <div className="grid lg:grid-cols-12 gap-x-2">
        <div
          className={`bg-card text-card-foreground lg:mb-2 pt-0 lg:col-span-8 mx-auto transition-all duration-300 ease-in-out ${
            isFullScreen
              ? "absolute top-0 left-0 w-screen h-screen flex flex-col justify-center items-center"
              : "relative"
          }`}
        >
          <WinnerPopup
            winner={winner}
            setWinner={setWinner}
            segData={segData}
            setSegData={setSegData}
            setShowCelebration={setShowCelebration}
            mustSpin={mustSpin}
          />
          <div
            onClick={handleSpinClick}
            className={`${
              isFullScreen ? "sm:h-screen mt-10" : "min-h-96 sm:h-[450px]"
            }`}
          >
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
              startingOptionIndex={prizeNumber}
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
          {/* Button to Handle FullScreen Toggle */}
          {/* <button
            onClick={handleToggle}
            className={
              isFullScreen
                ? `absolute top-12 right-12 text-3xl bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-2 focus:outline-none transition`
                : `absolute top-0 right-0 text-3xl bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-2 focus:outline-none transition`
            }
          >
            {isFullScreen ? (
              <AiOutlineClose className="text-2xl text-gray-900 dark:text-white" /> // Close icon
            ) : (
              <AiOutlineFullscreen className="text-2xl text-gray-900 dark:text-white" /> // Fullscreen expand icon
            )}
          </button> */}
        </div>
        <div
          className={`${
            isFullScreen
              ? "hidden"
              : "bg-card text-card-foreground mx-3 lg:p-2 lg:mx-1 lg:col-span-4 shadow-md"
          }`}
        >
          <Tabs
            defaultValue="list"
            style={{
              opacity: mustSpin ? 0.5 : 1, // Reduced opacity when isVisible is true
              pointerEvents: mustSpin ? "none" : "auto", // Disable pointer events when isVisible is true
            }}
          >
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
              <Tooltip text={isVisible ? "Hide Editor" : "Show Editor"} >
              <Button
                onClick={toggleVisibility}
                className="mx-1 my-1 py-0 h-7 text-xs"
              >
                {isVisible ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </Button>
              </Tooltip>

              <Settings />
            </TabsList>
            <TabsContent
              value="list"
              style={{ display: isVisible ? "block" : "none" }}
            >
              {/* For Advanced Editor Selection */}
              {/* <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="advanced-options"
                  checked={advancedOptions}
                  onChange={() => {
                    setadvancedOptions(!advancedOptions);
                  }}
                  className="mr-2"
                />
                <label htmlFor="advanced-options" className="text-xs">
                  Advanced Editor{" "}
                  <FaPencilRuler size={20} className="ml-1 inline" />
                </label>
              </div> */}
              {advancedOptions ? (
                <ScrollableSegmentsEditor
                  dataSegments={data}
                  setSegmentsData={setData}
                  setSegTxtData={setSegData}
                />
              ) : (
                <ContentEditableDiv segData={segData} setSegData={setSegData} />
              )}
            </TabsContent>
            <TabsContent
              value="result"
              style={{ display: isVisible ? "block" : "none" }}
            >
              <ContentEditableDivResult resultList={resultList} />
            </TabsContent>
          </Tabs>
          <div>
            <SaveImportComponent segments={segData} onImport={setSegData} />
          </div>
          {showCelebration && <FireworksConfetti />}
        </div>
      </div>
    </>
  );
};

export default WheelWithInputContentEditable;
