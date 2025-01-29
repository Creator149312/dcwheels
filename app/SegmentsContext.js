"use client";
import { createContext, useRef, useState } from "react";
import defaultWheelJSON from "@data/formatJSON";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";

export const SegmentsContext = createContext();

// const Wheels = [defaultWheelJSON];

export const SegmentsProvider = ({ children }) => {
  const MAX_OPTIONS_ON_WHEEL = defaultWheelJSON.wheelData.maxNumberOfOptions;
  const INNER_RADIUS = defaultWheelJSON.wheelData.innerRadius;
  const MAX_SPIN_TIME = defaultWheelJSON.wheelData.spinDuration;

  const html = useRef(`<div>TestData</div>`);
  const [resultList, setResultList] = useState([]);
  const [advancedOptions, setadvancedOptions] = useState(
    defaultWheelJSON.editorData.advOptions
  );
  const [wheelTitle, setWheelTitle] = useState(defaultWheelJSON.title);
  const [wheelDescription, setWheelDescription] = useState(
    defaultWheelJSON.description
  );

  const [wheelData, setWheelData] = useState(defaultWheelJSON.wheelData);
  const [segData, setSegData] = useState(defaultWheelJSON.data);
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

  const prepareDataForEditorSwitch = (advOptions) => {
    console.log("ADV OPT = ", advOptions);
    if (advOptions) {
      setSegData((prevSegData) =>
        prevSegData.map((segment, index) => ({
          text: segment.text,
          weight: 1,
          visible: true,
          color: wheelData.segColors[index % wheelData.segColors.length],
        }))
      );
    } else {
      html.current = segmentsToHTMLTxt(segData);
      setSegData((prevSegData) =>
        prevSegData.map((segment) => ({ text: segment.text }))
      );
    }
  };

  // Add a new segment
  const addSegment = (index) => {
    const newSegment = { text: "New", weight: 1, visible: true };
    if (index >= 0) {
      setSegData((prevSegData) => {
        const newSegData = JSON.parse(JSON.stringify(prevSegData[index]));
        return [...prevSegData, newSegData];
      });
    } else {
      setSegData((prevSegData) => [...prevSegData, newSegment]);
    }
  };

  // Update a segment's property
  const updateSegment = (index, field, value) => {
    setSegData((prevSegData) =>
      prevSegData.map((segment, i) =>
        i === index ? { ...segment, [field]: value } : segment
      )
    );
  };

  // Delete a segment
  const deleteSegment = (index) => {
    setSegData((prevSegData) => prevSegData.filter((_, i) => i !== index));
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
        deleteSegment,
        prepareDataForEditorSwitch,
        updateSegment,
        addSegment,
        data,
        segData,
        advancedOptions,
        setadvancedOptions,
        setSegData,
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
