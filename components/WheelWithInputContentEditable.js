"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useContext } from "react";
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
import ContentEditableDivImageTest from "./ContentEditableDivImageTest";
import EditorSwitchWithPopup from "./EditorSwitchWithPopup";
import TabsListOnEditor from "./TabsListOnEditor";
import {
  prepareData,
  getWheelData,
  calculateMaxLengthOfText,
  calculateFontSizeOfText,
} from "@utils/HelperFunctions";
import { usePathname, useRouter } from "next/navigation";
import SharePopup from "./SharePopup";

const WheelWithInputContentEditable = ({
  newSegments,
  wheelPresetSettings,
}) => {
  const {
    resultList,
    setResultList,
    wheelData,
    data,
    setData,
    html,
    setWheelData,
    MAX_SPIN_TIME,
    setWheelDescription,
    setWheelTitle,
    wheelTitle,
    wheelDescription,
  } = useContext(SegmentsContext);
  const [mustSpin, setMustSpin] = useState(false);
  const { status, data: session } = useSession();
  const currentPath = usePathname();
  const router = useRouter();
  const [localStorageWheel, setLocalStorageWheel] = useState(null);
  const [prizeNumber, setPrizeNumber] = useState(-1);
  // using the following prizeNumber causes error due to newSegments when wheel is imported.
  // const [prizeNumber, setPrizeNumber] = useState( Math.floor(Math.random() * newSegments.length));

  const [segData, setSegData] = useState([]);
  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  const [advancedOptions, setadvancedOptions] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // state to control visibility
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [maxlengthOfSegmentText, setMaxlengthOfSegmentText] = useState(1);
  const [segTxtfontSize, setSegTxtfontSize] = useState(1);

  const handleSpinClick = () => {
    if (!mustSpin) {
      setMustSpin(true);
      // setShowCelebration(false);

      let newPrizeNumber = advancedOptions
        ? pickRandomWinner()
        : Math.floor(
            Math.random() *
              (data.length < wheelData.maxNumberOfOptions
                ? data.length
                : wheelData.maxNumberOfOptions)
          );
      // console.log("Prize Number = ", newPrizeNumber);
      setPrizeNumber(newPrizeNumber);
    }
  };

  const saveWheelData = (segData, wheelData) => {
    // Prepare the page data with user input
    const wheelObject = {
      title: wheelTitle || "Default Title", // Default title if no input
      description: wheelDescription || "Default Description", // Default description if no input
      data: segData,
      wheelData: wheelData,
    };

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("wheelObject", JSON.stringify(wheelObject));
        // setLocalStorageWheel(wheelObject);
        console.log("New Wheel Saved on Browser =", wheelObject);
      } catch (e) {
        console.error("Error saving to localStorage", e);
      }
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

  // useEffect(() => {
  //   if (currentPath === "/") {
  //     //do this when we are in the homepage
  //     let wheelFromBrowserStorage = getWheelData();
  //     setLocalStorageWheel(wheelFromBrowserStorage);
  //     console.log("browser saved wheel = ", wheelFromBrowserStorage);

  //     if (wheelFromBrowserStorage !== null) {
  //       setSegData(wheelFromBrowserStorage.data);
  //       setWheelData(wheelFromBrowserStorage.wheelData);
  //       // maxlengthOfSegmentText = calculateMaxLengthOfText(
  //       //   wheelFromBrowserStorage.data
  //       // );

  //       // segTxtfontSize = calculateFontSizeOfText(
  //       //   maxlengthOfSegmentText,
  //       //   wheelFromBrowserStorage.data
  //       // );

  //       setMaxlengthOfSegmentText(
  //         calculateMaxLengthOfText(wheelFromBrowserStorage.data)
  //       );

  //       setSegTxtfontSize(
  //         calculateFontSizeOfText(
  //           maxlengthOfSegmentText,
  //           wheelFromBrowserStorage.data
  //         )
  //       );

  //       html.current = wheelFromBrowserStorage.data
  //         .map((perSegData) => `<div>${perSegData}</div>`)
  //         .join("");
  //     }
  //   }

  //   setPrizeNumber(Math.floor(Math.random() * newSegments.length));
  //   setData(prepareData(segData, wheelData.segColors, maxlengthOfSegmentText));
  //   // setadvancedOptions(true);

  //   if (wheelPresetSettings !== null && wheelPresetSettings !== undefined)
  //     setWheelData(wheelPresetSettings);
  // }, []);

  useEffect(() => {
    console.log("Inside Parameterized User Effect");
    if (!advancedOptions) {
      setData(
        prepareData(segData, wheelData.segColors, maxlengthOfSegmentText)
      );

      setMaxlengthOfSegmentText(calculateMaxLengthOfText(segData));

      setSegTxtfontSize(
        calculateFontSizeOfText(maxlengthOfSegmentText, segData)
      );

      console.log("LocalStorageWheelData = ", localStorageWheel);
      if (localStorageWheel !== null) saveWheelData(segData, wheelData);
    }
  }, [segData, wheelData, advancedOptions]);

  useEffect(() => {
    console.log("Inside Blank User Effect");
    if (currentPath === "/") {
      //do this when we are in the homepage
      let wheelFromBrowserStorage = getWheelData();
      setLocalStorageWheel(wheelFromBrowserStorage);
      console.log("browser saved wheel = ", wheelFromBrowserStorage);

      if (wheelFromBrowserStorage !== null) {
        let localSegData = wheelFromBrowserStorage.data;
        let localWheelData = wheelFromBrowserStorage.wheelData;
        setSegData(localSegData);
        setWheelData(localWheelData);

        let initialMaxLength = calculateMaxLengthOfText(localSegData);
        setMaxlengthOfSegmentText(initialMaxLength);

        setSegTxtfontSize(
          calculateFontSizeOfText(initialMaxLength, localSegData)
        );

        setPrizeNumber(Math.floor(Math.random() * localSegData.length));
        setData(
          prepareData(
            localSegData.length,
            localWheelData.segColors,
            initialMaxLength
          )
        );
        // setadvancedOptions(true);

        html.current = localSegData
          .map((perSegData) => `<div>${perSegData}</div>`)
          .join("");
      } else {
        let initialMaxLength = calculateMaxLengthOfText(newSegments);
        setMaxlengthOfSegmentText(initialMaxLength);

        setSegTxtfontSize(
          calculateFontSizeOfText(initialMaxLength, newSegments)
        );
        setSegData(newSegments);
        setPrizeNumber(Math.floor(Math.random() * newSegments.length));
        setData(
          prepareData(newSegments, wheelData.segColors, maxlengthOfSegmentText)
        );

        html.current = newSegments
          .map((perSegData) => `<div>${perSegData}</div>`)
          .join("");
        saveWheelData(newSegments, wheelData);
        // setadvancedOptions(true);
      }
    } else {
      setSegData(newSegments);

      let initialMaxLength = calculateMaxLengthOfText(newSegments);
      setMaxlengthOfSegmentText(initialMaxLength);

      setSegTxtfontSize(calculateFontSizeOfText(initialMaxLength, newSegments));
      setPrizeNumber(Math.floor(Math.random() * newSegments.length));
      setData(
        prepareData(newSegments, wheelData.segColors, maxlengthOfSegmentText)
      );

      html.current = newSegments
        .map((perSegData) => `<div>${perSegData}</div>`)
        .join("");

      if (wheelPresetSettings !== null && wheelPresetSettings !== undefined) {
        setWheelData(wheelPresetSettings);
        saveWheelData(newSegments, wheelPresetSettings);
      } else {
        saveWheelData(newSegments, wheelData);
      }
      // setadvancedOptions(true);
    }
    // if (wheelPresetSettings !== null && wheelPresetSettings !== undefined)
    //   setWheelData(wheelPresetSettings);
  }, []);

  useEffect(() => {
    if (winner !== "" && winner !== undefined) {
      setResultList([...resultList, winner]);
    }
  }, [winner]);

  const toggleVisibility = () => {
    setIsVisible((prevState) => !prevState); // toggle the state between true and false
  };

  // Function to handle toggling full screen mode
  const handleToggleFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }

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
            prizeNumber={prizeNumber}
            setWinner={setWinner}
            segData={segData}
            setSegData={setSegData}
            setShowCelebration={setShowCelebration}
            mustSpin={mustSpin}
          />
          <div
            onClick={handleSpinClick}
            className={`flex items-center justify-center
${isFullScreen ? "mb-2" : "min-h-96 sm:h-[450px]"}`}
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
              textDistance={
                // 65 + segData.length / 8 < 95 ? 60 + segData.length / 8 : 95
                50 + 0.4 * segData.length
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
              // disableInitialAnimation={"false"}
              spinDuration={wheelData.spinDuration / MAX_SPIN_TIME}
              // startingOptionIndex={prizeNumber}
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
          <div className="flex items-center space-x-4">
            {/* <ShareButton segmentsData={segData}/> */}
            {/* <ShareWheelBtn segmentsData={segData} /> */}
            <SharePopup url={currentPath} />
            {isFullScreen ? (
              <Button onClick={handleToggleFullScreen}> Exit Fullscreen</Button>
            ) : (
              <Button onClick={handleToggleFullScreen}> Fullscreen</Button>
            )}
          </div>
        </div>

        <div
          className={`${
            isFullScreen
              ? "hidden"
              : "bg-card text-card-foreground mx-3 lg:p-2 lg:mx-1 lg:col-span-4 shadow-md"
          }`}
        >
          {currentPath === "/" ? (
            <>
              <Tabs
                defaultValue="list"
                style={{
                  opacity: mustSpin ? 0.5 : 1, // Reduced opacity when isVisible is true
                  pointerEvents: mustSpin ? "none" : "auto", // Disable pointer events when isVisible is true
                }}
              >
                <TabsList className="w-full">
                  <TabsListOnEditor
                    segData={segData}
                    resultList={resultList}
                    isVisible={isVisible}
                    toggleVisibility={toggleVisibility}
                    handleToggle={handleToggleFullScreen}
                    isFullScreen={isFullScreen}
                  />
                </TabsList>
                <TabsContent
                  value="list"
                  style={{ display: isVisible ? "block" : "none" }}
                >
                  {/* For Advanced Editor Selection */}
                  <EditorSwitchWithPopup
                    advOpt={advancedOptions}
                    setAdvOpt={setadvancedOptions}
                  />

                  {advancedOptions ? (
                    <ScrollableSegmentsEditor
                      dataSegments={data}
                      setSegmentsData={setData}
                      setSegTxtData={setSegData}
                    />
                  ) : (
                    // <ContentEditableDiv segData={segData} setSegData={setSegData} />
                    <ContentEditableDivImageTest
                      segData={segData}
                      setSegData={setSegData}
                    />
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
            </>
          ) : (
            <Button
              onClick={(e) => {
                saveWheelData(segData, wheelData);
                if (currentPath !== "/") router.push("/");
              }}
            >
              Copy and Edit
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default WheelWithInputContentEditable;
