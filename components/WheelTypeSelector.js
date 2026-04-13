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

  const labels = {
    basic: "Basic",
    advanced: "Advanced",
    learn: "Learn",
    quiz: "Quiz",
  };

  return (
    <div className="flex items-center gap-2 my-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
        Wheel Type
      </label>
      <select
        value={selectedType}
        onChange={handleChange}
        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring cursor-pointer"
      >
        {types.map((type, index) => (
          <option key={index} value={type}>
            {labels[type] ?? type}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WheelTypeSelector;
