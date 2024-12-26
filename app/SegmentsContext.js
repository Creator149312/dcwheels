"use client";
import { createContext, useRef, useState } from "react";

export const SegmentsContext = createContext();

export const SegmentsProvider = ({ children }) => {
  const html = useRef(`<div>TestData</div>`);
  const [resultList, setResultList] = useState([]);
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
    spinDuration: 0.5
  });
  const [data, setData] = useState([]);
  const [segments, setSegments] = useState([]);
  const [userInputText, setUserInputText] = useState(
    "Purple\nView\nViolot\nVulgar\nBowl\nPile"
  );

  const handleSpinDurationChange = (newDuration) => {
    setWheelData({ ...wheelData, spinDuration: newDuration });
  };

  const handleSegColorsChange = (newColorTheme) => {
    setWheelData({ ...wheelData, segColors: newColorTheme });
  }

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
        setWheelData
      }}
    >
      {children}
    </SegmentsContext.Provider>
  );
};
