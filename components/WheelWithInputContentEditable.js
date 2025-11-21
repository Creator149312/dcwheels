"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useContext } from "react";
import WinnerPopup from "@components/WinnerPopup";
// import { Wheel } from "react-custom-roulette";
// we are not using above import because it causes ReferenceError: window is not defined , workaround is the following import

import FireworksConfetti from "@components/FireworksConfetti";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { useSession } from "next-auth/react";
import ContentEditableDivResult from "./ContentEditableDivResult";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import SaveImportComponent from "./SaveImportComponent";
import ContentEditableDivImageTest from "./ContentEditableDivImageTest";
import EditorSwitchWithPopup from "./EditorSwitchWithPopup";
import TabsListOnEditor from "./TabsListOnEditor";
import {
  prepareData,
  getWheelData,
  calculateMaxLengthOfText,
  calculateFontSizeOfText,
  segmentsToHTMLTxt,
} from "@utils/HelperFunctions";
import { usePathname, useRouter } from "next/navigation";
import AIListGenerator from "./AIListGenerator";
import ScrollableSegmentsEditorAdv from "./ScrollableSegmentsEditorAdv";
import ListSelector from "./lists/ListSelector";
import toast from "react-hot-toast";
import GenerateWheel from "@components/GenerateWheel";
import WheelPlayerControls from "./WheelPlayerControls";
import AdsScriptLoader from "./ads/AdsScriptLoader";
import AdsUnit from "./ads/AdsUnit";
const Wheel = dynamic(
  () => import("react-custom-roulette").then((mod) => mod.Wheel),
  { ssr: false }
);

const WheelWithInputContentEditable = ({
  newSegments,
  wheelPresetSettings,
}) => {
  const {
    resultList,
    setResultList,
    wheelData,
    segData,
    setSegData,
    data,
    setData,
    html,
    setWheelData,
    MAX_SPIN_TIME,
    setWheelDescription,
    setWheelTitle,
    wheelTitle,
    wheelDescription,
    advancedOptions,
    setadvancedOptions,
    INNER_RADIUS,
    FONT_SIZE,
  } = useContext(SegmentsContext);
  const [mustSpin, setMustSpin] = useState(false);
  const { status, data: session } = useSession();
  const currentPath = usePathname();
  const router = useRouter();
  const [localStorageWheel, setLocalStorageWheel] = useState(null);
  const [prizeNumber, setPrizeNumber] = useState(-1);
  // using the following prizeNumber causes error due to newSegments when wheel is imported.
  // const [prizeNumber, setPrizeNumber] = useState( Math.floor(Math.random() * newSegments.length));

  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // state to control visibility
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [maxlengthOfSegmentText, setMaxlengthOfSegmentText] = useState(1);
  const [segTxtfontSize, setSegTxtfontSize] = useState(
    wheelData?.fontSize ? wheelData.fontSize : 1
  );
  const [showOverlay, setShowOverlay] = useState(true);

  // console.log("SegData = ", segData);
  // console.log("New Segments = ", newSegments);

  // console.log("DATA for Wheel", data);

  /**
   * used to handle what needs to be done when spin wheel is clicked
   */
  const handleSpinClick = () => {
    if (!mustSpin) {
      setShowOverlay(false);
      setMustSpin(true);

      let newPrizeNumber = advancedOptions
        ? pickRandomWinner()
        : Math.floor(
            Math.random() *
              (data.length < wheelData.maxNumberOfOptions
                ? data.length
                : wheelData.maxNumberOfOptions)
          );

      // console.log(" Prize Number before Setting = ", newPrizeNumber);
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
      // console.log("Wheel Object = ", wheelObject);
      try {
        window.localStorage.setItem(
          "SpinpapaWheel",
          JSON.stringify(wheelObject)
        );
        // setLocalStorageWheel(wheelObject);
        // console.log("New Wheel Saved on Browser =", wheelObject);
      } catch (e) {
        toast.error("Error saving wheel, Please try again after sometime!");
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

  useEffect(() => {
    // console.log("Inside Parameterized User Effect");
    setData(
      prepareData(
        segData,
        wheelData.segColors,
        maxlengthOfSegmentText,
        advancedOptions
      )
    );

    setMaxlengthOfSegmentText(calculateMaxLengthOfText(segData));

    setSegTxtfontSize(calculateFontSizeOfText(maxlengthOfSegmentText, segData));

    if (localStorageWheel !== null) saveWheelData(segData, wheelData);
  }, [segData, wheelData, advancedOptions]);

  useEffect(() => {
    // console.log("Inside Blank User Effect");
    if (currentPath === "/") {
      //do this when we are in the homepage
      let wheelFromBrowserStorage = getWheelData();
      setLocalStorageWheel(wheelFromBrowserStorage);
      // console.log("browser saved wheel = ", wheelFromBrowserStorage);

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
            initialMaxLength,
            advancedOptions
          )
        );
        // setadvancedOptions(true);

        // html.current = localSegData
        //   .map((perSegData) => `<div>${perSegData.text}</div>`)
        //   .join("");

        html.current = segmentsToHTMLTxt(localSegData);
      } else {
        let initialMaxLength = calculateMaxLengthOfText(newSegments);
        setMaxlengthOfSegmentText(initialMaxLength);

        setSegTxtfontSize(
          calculateFontSizeOfText(initialMaxLength, newSegments)
        );
        setSegData(newSegments);
        setPrizeNumber(Math.floor(Math.random() * newSegments.length));
        setData(
          prepareData(
            newSegments,
            wheelData.segColors,
            maxlengthOfSegmentText,
            advancedOptions
          )
        );

        html.current = segmentsToHTMLTxt(newSegments);

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
        prepareData(
          newSegments,
          wheelData.segColors,
          maxlengthOfSegmentText,
          advancedOptions
        )
      );

      // html.current = newSegments
      //   .map((perSegData) => `<div>${perSegData.text}</div>`)
      //   .join("");
      html.current = segmentsToHTMLTxt(newSegments);

      if (wheelPresetSettings !== null && wheelPresetSettings !== undefined) {
        setWheelData(wheelPresetSettings);
        // saveWheelData(newSegments, wheelPresetSettings);
      } else {
        // saveWheelData(newSegments, wheelData);
      }
      // setadvancedOptions(true);
    }
    // if (wheelPresetSettings !== null && wheelPresetSettings !== undefined)
    //   setWheelData(wheelPresetSettings);
  }, []);

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

  const [showControls, setShowControls] = useState(false);

  return (
    <>
      <div className="grid lg:grid-cols-12 gap-x-2">
        <div
          className={`bg-card flex flex-col items-center text-card-foreground lg:mb-2 lg:col-span-8 mx-auto transition-all duration-300 ease-in-out ${
            isFullScreen ? "fixed inset-0 z-50 bg-black" : "relative w-full"
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

          {showOverlay && (
            <div
              onClick={handleSpinClick}
              className="z-10 absolute inset-0 flex items-center justify-center rounded-full text-4xl font-bold text-white"
              style={{ textShadow: "2px 2px 0 rgba(0, 0, 0, 0.2)" }}
            >
              Click to Spin
            </div>
          )}

          {/* Wheel container fills available space */}
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

          {/* Controls bar below wheel */}

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
          />
        </div>

        <div
          className={`${
            isFullScreen
              ? "hidden"
              : "bg-card text-card-foreground mx-3 lg:p-2 lg:mx-1 lg:col-span-4 rounded-xl"
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
                    advOptions={advancedOptions}
                  />
                </TabsList>
                <TabsContent
                  value="list"
                  style={{ display: isVisible ? "block" : "none" }}
                >
                  <ListSelector html={html} setSegData={setSegData} />
                  {/* <ListSelectorAdv /> */}
                  {/* For Advanced Editor Selection */}
                  <EditorSwitchWithPopup
                    advOpt={advancedOptions}
                    setAdvOpt={setadvancedOptions}
                  />

                  {advancedOptions ? (
                    <ScrollableSegmentsEditorAdv />
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
                <GenerateWheel url={currentPath} />
                <SaveImportComponent segments={segData} onImport={setSegData} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              {/* <Button
                onClick={(e) => {
                  saveWheelData(segData, wheelData);
                  if (currentPath !== "/") router.push("/");
                }}
                className="mb-2"
              >
                Copy and Edit
              </Button> */}
            </div>
          )}
        </div>
        {showCelebration && <FireworksConfetti />}
      </div>
    </>
  );
};

export default WheelWithInputContentEditable;
