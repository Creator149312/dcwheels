"use client";
import { createContext, useRef, useState } from "react";

export const SegmentsContext = createContext();

export const SegmentsProvider = ({ children }) => {
  const html = useRef(`<div>TestData</div>`);
  const [resultList, setResultList] = useState([]);
  const [segments, setSegments] = useState([]);
  const [userInputText, setUserInputText] = useState(
    "Purple\nView\nViolot\nVulgar\nBowl\nPile"
  );

  return (
    <SegmentsContext.Provider
      value={{ segments, html, resultList, setResultList, userInputText, setUserInputText }}
    >
      {children}
    </SegmentsContext.Provider>
  );
};
