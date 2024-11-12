'use client'
import { createContext, useRef, useState } from 'react';

export const SegmentsContext = createContext();

export const SegmentsProvider = ({ children }) => {
  const html = useRef(`<div> This is a paragraph.</div>`);
  const [segments, setSegments] = useState([]);
  const [userInputText, setUserInputText] = useState("Purple\nView\nViolot\nVulgar\nBowl\nPile");
  
  return (
    <SegmentsContext.Provider value={{ segments, html, setSegments, userInputText, setUserInputText}}>
      {children}
    </SegmentsContext.Provider>
  );
};