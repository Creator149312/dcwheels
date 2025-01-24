"use client";
import { createContext, useRef, useState } from "react";

export const SegmentsContext = createContext();

export const SegmentsProvider = ({ children }) => {
  const html = useRef(`<div>TestData</div>`);
  const [resultList, setResultList] = useState([]);
  const [wheelTitle, setWheelTitle] = useState("New Wheel");
  const [wheelDescription, setWheelDescription] = useState(
    "This is a new spinpapa wheel"
  );
  const MAX_OPTIONS_ON_WHEEL = 100;
  const INNER_RADIUS = 15;
  const MAX_SPIN_TIME = 10;
  //this wheelData will contain the default wheelData that we use
  const [wheelData, setWheelData] = useState({
    segColors: [
      "#EE4040",
      "#F0CF50",
      "#815CD1",
      "#3DA5E0",
      "#34A24F",
      "#F9AA1F",
      "#EC3F3F",
      "#FF9000",
    ],
    spinDuration: MAX_SPIN_TIME / 2,
    maxNumberOfOptions: MAX_OPTIONS_ON_WHEEL, //this is max number of options to show on wheel
    innerRadius: INNER_RADIUS,
  });
  const [data, setData] = useState([]);
  const [segments, setSegments] = useState([]);
  const [userInputText, setUserInputText] = useState(
    "Purple\nView\nViolot\nVulgar\nBowl\nPile"
  );

  const handleWheelSettingsChange = (newSettings) => {
    setWheelData((prevWheelData) => ({
      ...prevWheelData,
      ...newSettings,
    }));
  };

  const handleSegColorsChange = (newColorTheme) => {
    setWheelData((prevWheelData) => ({
      ...prevWheelData,
      segColors: newColorTheme,
    }));
  };

  const handleInnerRadiusChange = (newRadius) => {
    setWheelData((prevWheelData) => ({
      ...prevWheelData,
      innerRadius: newRadius,
    }));
  };

  const handleMaxNumberOfOptionsChange = (newMax) => {
    setWheelData((prevWheelData) => ({
      ...prevWheelData,
      maxNumberOfOptions: newMax,
    }));
  };

  const handleSpinDurationChange = (newDuration) => {
    setWheelData((prevWheelData) => ({
      ...prevWheelData,
      spinDuration: newDuration,
    }));
  };

  return (
    <SegmentsContext.Provider
      value={{
        segments,
        html,
        resultList,
        setResultList,
        userInputText,
        setUserInputText,
        data,
        setData,
        wheelData,
        handleSpinDurationChange,
        handleSegColorsChange,
        setWheelData,
        handleMaxNumberOfOptionsChange,
        MAX_OPTIONS_ON_WHEEL,
        MAX_SPIN_TIME,
        setWheelDescription,
        setWheelTitle,
        wheelTitle,
        wheelDescription,
        handleWheelSettingsChange,
        handleInnerRadiusChange,
      }}
    >
      {children}
    </SegmentsContext.Provider>
  );
};
