"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { useState, useEffect, useContext } from "react";

const WheelTypeSelector = ({
  types = ["basic", "advanced", "learn", "quiz"],
}) => {
  const { wheelType, setWheelType } = useContext(SegmentsContext);
  const [selectedType, setSelectedType] = useState(wheelType);

  // When the selectedType changes, trigger the associated action passed via onTypeChange prop
  useEffect(() => {
    setWheelType(selectedType);
  }, [selectedType]);

  // Handle the type change when the user selects a new type
  const handleChange = (event) => {
    setSelectedType(event.target.value);
  };

  return (
    <div>
      <select value={selectedType} onChange={handleChange}>
        {types.map((type, index) => (
          <option key={index} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WheelTypeSelector;
