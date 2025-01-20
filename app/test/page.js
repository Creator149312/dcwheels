import React from "react";
let lengths = 10;
let segments = 5;

function CellValue() {
  const calculateCellValue = (lengths, segments) => {
    return 1 / Math.max(lengths, segments);
  };

  const cellValue = calculateCellValue(lengths, segments);

  return (
    <div>
      <h1>Cell Value</h1>
      <p>Lengths: {lengths}</p>
      <p>Segments: {segments}</p>
      <p>Cell Value: {48 * cellValue}</p>
    </div>
  );
}

export default CellValue;
