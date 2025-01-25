"use client";
import { createContext, useRef, useState } from "react";
import defaultWheelJSON from "@data/formatJSON";

export const SegmentsContext = createContext();

// const Wheels = [defaultWheelJSON];

export const SegmentsProvider = ({ children }) => {
  const MAX_OPTIONS_ON_WHEEL = defaultWheelJSON.wheelData.maxNumberOfOptions;
  const INNER_RADIUS = defaultWheelJSON.wheelData.innerRadius;
  const MAX_SPIN_TIME = defaultWheelJSON.wheelData.spinDuration;
  
  const html = useRef(`<div>TestData</div>`);
  const [resultList, setResultList] = useState([]);
  const [wheelTitle, setWheelTitle] = useState(defaultWheelJSON.title);
  const [wheelDescription, setWheelDescription] = useState(
    defaultWheelJSON.description
  );

  const [wheelData, setWheelData] = useState(defaultWheelJSON.wheelData);
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

  // const handleSegColorsChange = (newColorTheme) => {
  //   setWheelData((prevWheelData) => ({
  //     ...prevWheelData,
  //     segColors: newColorTheme,
  //   }));
  // };

  // const handleInnerRadiusChange = (newRadius) => {
  //   setWheelData((prevWheelData) => ({
  //     ...prevWheelData,
  //     innerRadius: newRadius,
  //   }));
  // };

  // const handleMaxNumberOfOptionsChange = (newMax) => {
  //   setWheelData((prevWheelData) => ({
  //     ...prevWheelData,
  //     maxNumberOfOptions: newMax,
  //   }));
  // };

  // const handleSpinDurationChange = (newDuration) => {
  //   setWheelData((prevWheelData) => ({
  //     ...prevWheelData,
  //     spinDuration: newDuration,
  //   }));
  // };

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
        setWheelData,
        MAX_OPTIONS_ON_WHEEL,
        MAX_SPIN_TIME,
        setWheelDescription,
        setWheelTitle,
        wheelTitle,
        wheelDescription,
        handleWheelSettingsChange,
      }}
    >
      {children}
    </SegmentsContext.Provider>
  );
};
