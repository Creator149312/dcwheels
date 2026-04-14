"use client";
import { useState, useEffect, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import {
  prepareData,
  getWheelData,
  calculateMaxLengthOfText,
  calculateFontSizeOfText,
  segmentsToHTMLTxt,
} from "@utils/HelperFunctions";
import { usePathname } from "next/navigation";
import { useWheelSounds } from "./useWheelSounds";
import toast from "react-hot-toast";

export function useWheelState({ newSegments, wheelPresetSettings, wheelId }) {
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
    wheelTitle,
    wheelDescription,
    advancedOptions,
    wheelType,
    setWheelType,
  } = useContext(SegmentsContext);

  const currentPath = usePathname();

  const [mustSpin, setMustSpin] = useState(false);
  const [localStorageWheel, setLocalStorageWheel] = useState(null);
  const [prizeNumber, setPrizeNumber] = useState(-1);
  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  const [maxlengthOfSegmentText, setMaxlengthOfSegmentText] = useState(1);
  const [segTxtfontSize, setSegTxtfontSize] = useState(
    wheelData?.fontSize ? wheelData.fontSize : 1
  );
  const [showOverlay, setShowOverlay] = useState(true);
  const [muted, setMuted] = useState(false);
  const { startTicking, stopTicking, playVictory } = useWheelSounds(muted);

  const saveWheelData = (segData, wheelData) => {
    const wheelObject = {
      title: wheelTitle || "Default Title",
      description: wheelDescription || "Default Description",
      type: wheelType || "basic",
      data: segData,
      wheelData: wheelData,
    };
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("SpinpapaWheel", JSON.stringify(wheelObject));
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
    const randomValue = Math.floor(Math.random() * totalWeight);
    let cumulativeWeight = 0;
    for (let i = 0; i < data.length; i++) {
      cumulativeWeight += parseInt(data[i].optionSize);
      if (randomValue < cumulativeWeight) return i;
    }
  };

  const handleSpinClick = () => {
    if (!mustSpin) {
      setShowOverlay(false);
      setMustSpin(true);
      // react-custom-roulette total animation = (2600 + 750 + 8000) * spinDurationProp
      // spinDurationProp = wheelData.spinDuration / MAX_SPIN_TIME
      const spinDurationProp = wheelData.spinDuration / MAX_SPIN_TIME;
      const actualSpinMs = 11350 * spinDurationProp;
      startTicking(actualSpinMs);
      const newPrizeNumber = advancedOptions
        ? pickRandomWinner()
        : Math.floor(
            Math.random() *
              (data.length < wheelData.maxNumberOfOptions
                ? data.length
                : wheelData.maxNumberOfOptions)
          );
      setPrizeNumber(newPrizeNumber);
    }
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    stopTicking();
    playVictory();
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

    if (wheelId) {
      fetch("/api/wheel-analytics/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wheelId }),
        keepalive: true,
      })
        .then((res) => {
          if (res.ok && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("wheel:spin-counted", { detail: { wheelId } })
            );
          }
        })
        .catch(() => {
          // Silent analytics failure by design.
        });
    }
  };

  // Sync data when segments/wheel settings change
  useEffect(() => {
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
    // Save on home page always so wheel type and data survive a refresh
    if (currentPath === "/") saveWheelData(segData, wheelData);
  }, [segData, wheelData, advancedOptions, wheelType]);

  // Initialize from localStorage or props on mount
  useEffect(() => {
    if (currentPath === "/") {
      const wheelFromBrowserStorage = getWheelData();
      setLocalStorageWheel(wheelFromBrowserStorage);

      if (wheelFromBrowserStorage !== null) {
        const localSegData = wheelFromBrowserStorage.data;
        const localWheelData = wheelFromBrowserStorage.wheelData;
        if (wheelFromBrowserStorage.type) setWheelType(wheelFromBrowserStorage.type);
        setSegData(localSegData);
        setWheelData(localWheelData);

        const initialMaxLength = calculateMaxLengthOfText(localSegData);
        setMaxlengthOfSegmentText(initialMaxLength);
        setSegTxtfontSize(calculateFontSizeOfText(initialMaxLength, localSegData));
        setPrizeNumber(Math.floor(Math.random() * localSegData.length));
        setData(
          prepareData(
            localSegData.length,
            localWheelData.segColors,
            initialMaxLength,
            advancedOptions
          )
        );
        html.current = segmentsToHTMLTxt(localSegData);
      } else {
        const initialMaxLength = calculateMaxLengthOfText(newSegments);
        setMaxlengthOfSegmentText(initialMaxLength);
        setSegTxtfontSize(calculateFontSizeOfText(initialMaxLength, newSegments));
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
      }
    } else {
      setSegData(newSegments);
      const initialMaxLength = calculateMaxLengthOfText(newSegments);
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
      html.current = segmentsToHTMLTxt(newSegments);
      if (wheelPresetSettings != null) setWheelData(wheelPresetSettings);
    }
  }, []);

  return {
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
  };
}
