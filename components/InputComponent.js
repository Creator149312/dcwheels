"use client";
import { useEffect, useState, useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";

function InputComponent() {
  const { segments, setSegments } = useContext(SegmentsContext);
  const { userInputText, setUserInputText } = useContext(SegmentsContext);

  useEffect(() => {
    setSegments([]);
    processText();
  }, [userInputText]);

  const handleTextAreaChange = (event) => {
    setSegments([]);
    setUserInputText(event.target.value);
    processText(); //this was extra calling 
  };

  const processText = () => {
    const lines = userInputText.split("\n");
    let segmentSectors = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== "" && lines[i] !== undefined)
        segmentSectors.push(lines[i].trim());
    }
    setSegments(segmentSectors);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <textarea
          value={userInputText}
          onChange={handleTextAreaChange}
          placeholder="Add Your List Data....." // Adjust rows as needed
          className="md:h-80 h-64 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </>
  );
}

export default InputComponent;
