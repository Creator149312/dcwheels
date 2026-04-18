"use client";
import { createContext, useEffect, useRef, useState } from "react";
import defaultWheelJSON from "@data/formatJSON";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import { normalizeSegments, createSegment } from "@utils/segmentUtils";

export const SegmentsContext = createContext();
export const SegmentsProvider = ({ children }) => {
  const MAX_OPTIONS_ON_WHEEL = defaultWheelJSON.wheelData.maxNumberOfOptions;
  const INNER_RADIUS = defaultWheelJSON.wheelData.innerRadius;
  const FONT_SIZE = defaultWheelJSON.wheelData.fontSize;
  const MAX_SPIN_TIME = defaultWheelJSON.wheelData.spinDuration;
  // const [coins, setCoins] = useState(fetchCoinsFromStorage());
  const [coins, setCoins] = useState(100);
  const html = useRef(`<div>TestData</div>`);
  const [resultList, setResultList] = useState([]);

  const [advancedOptions, setadvancedOptions] = useState(
    defaultWheelJSON?.editorData?.advOptions
      ? defaultWheelJSON?.editorData?.advOptions
      : false
  );

  const [wheelTitle, setWheelTitle] = useState(defaultWheelJSON.title);
  const [wheelDescription, setWheelDescription] = useState(
    defaultWheelJSON.description
  );

  const [wheelType, setWheelType] = useState(defaultWheelJSON?.type ?? "basic");

  const [wheelData, setWheelData] = useState(defaultWheelJSON.wheelData);
  const [segData, setSegData] = useState(normalizeSegments(defaultWheelJSON.data));
  const [data, setData] = useState([{ option: "Loading...", style: { backgroundColor: "#EE4040" } }]);
  const [segments, setSegments] = useState([]);
  const [userInputText, setUserInputText] = useState(
    "Purple\nView\nViolot\nVulgar\nBowl\nPile"
  );

  useEffect(() => {
    const chosen = localStorage.getItem("SpinpapaWheelType");
    if (!chosen) return;

    localStorage.removeItem("SpinpapaWheelType");
    setWheelType(chosen);

    if (chosen === "quiz") {
      setSegData(normalizeSegments([
        { text: "Q1", question: "", options: ["", "", "", ""], correctIndex: 0, weight: 1, visible: true },
        { text: "Q2", question: "", options: ["", "", "", ""], correctIndex: 0, weight: 1, visible: true },
        { text: "Q3", question: "", options: ["", "", "", ""], correctIndex: 0, weight: 1, visible: true },
      ]));
    } else {
      setSegData(normalizeSegments(defaultWheelJSON.data));
    }
  }, []);

  const handleWheelSettingsChange = (newSettings) => {
    setWheelData((prevWheelData) => ({
      ...prevWheelData,
      ...newSettings,
    }));
  };

  const prepareDataForEditorSwitch = (advOptions) => {
    if (advOptions) {
      setSegData((prevSegData) =>
        prevSegData.map((segment, index) => ({
          ...segment,
          text: segment.text,
          weight: segment?.weight ? segment.weight : 1,
          visible: segment?.visible ? segment.visible : true,
          color: segment?.color
            ? segment.color
            : wheelData.segColors[index % wheelData.segColors.length],
        }))
      );
    } else {
      html.current = segmentsToHTMLTxt(segData);
      setSegData((prevSegData) =>
        prevSegData.map((segment) => ({
          id: segment.id,
          text: segment.text,
          type: segment.type || "basic",
          image: segment.image || null,
          payload: segment.payload || {},
        }))
      );
    }
  };

  // Add a new segment
  const addSegment = (index) => {
    if (index >= 0) {
      setSegData((prevSegData) => {
        const newSegData = JSON.parse(JSON.stringify(prevSegData[index]));
        // Give the duplicate a new id
        newSegData.id = createSegment().id;
        return [...prevSegData, newSegData];
      });
    } else {
      setSegData((prevSegData) => [...prevSegData, createSegment()]);
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
        coins,
        setCoins,
        setWheelData,
        MAX_OPTIONS_ON_WHEEL,
        MAX_SPIN_TIME,
        INNER_RADIUS,
        FONT_SIZE,
        setWheelDescription,
        setWheelTitle,
        wheelTitle,
        wheelDescription,
        wheelType,
        setWheelType,
        handleWheelSettingsChange,
      }}
    >
      {children}
    </SegmentsContext.Provider>
  );
};
