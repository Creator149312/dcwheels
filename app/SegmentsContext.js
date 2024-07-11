'use client'
import { createContext, useState } from 'react';

export const SegmentsContext = createContext();

export const SegmentsProvider = ({ children }) => {
  const [segments, setSegments] = useState([]);
  const [userInputText, setUserInputText] = useState("Purple\nView\nViolot\nVulgar\nBowl\nPile");
  const [canvas, setCanvas] = useState(null);
  
  return (
    <SegmentsContext.Provider value={{ segments, setSegments, userInputText, setUserInputText}}>
      {children}
    </SegmentsContext.Provider>
  );
};