"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { useContext, useState, useEffect } from "react";
import { FaTrashAlt, FaCopy } from "react-icons/fa";
import SegmentPropertiesEditorPopup from "./SegmentPropertiesEditorPopup";
import { Button } from "./ui/button";

const ScrollableSegmentsEditorAdv = () => {
  const { segData, deleteSegment, updateSegment, addSegment, wheelData } =
    useContext(SegmentsContext);

  // console.log("SEG DATA = ", segData);

  const calculateTotalWeight = () => {
    return segData.reduce((totalWgt, CurrentObject) => {
      return totalWgt + Number(CurrentObject.weight);
    }, 0);
  };

  const [totalWeight, setTotalWeight] = useState(calculateTotalWeight());

  useEffect(() => {
    setTotalWeight(calculateTotalWeight());
  }, [segData, wheelData]);

  return (
    <div className="space-y-4">
      {/* Scrollable area for editing segments */}
      <div className="overflow-y-auto md:h-72 h-64 bg-white dark:bg-gray-800 rounded-sm shadow-md">
        {segData.map((segment, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 mt-2 bg-gray-100 dark:bg-gray-700 py-1 px-1 shadow-md"
          >
            {/* Input Field for Segment Text */}
            {segment.text.includes('data:image') ? <div dangerouslySetInnerHTML={{__html: segment.text}} className="w-full"></div> : 
            <input
              type="text"
              value={segment.text}
              onChange={(e) => updateSegment(index, "text", e.target.value)} // Update the text for the segment
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
              placeholder="Enter text"
            />}

            {/* Checkbox for Segment Visibility */}
            <input
              type="checkbox"
              checked={segment.visible}
              onChange={(e) => {
                updateSegment(index, "visible", e.target.checked);
                updateSegment(index, "weight", e.target.checked ? 1 : 0);
              }} // Update visibility
              className="w-8 dark:bg-gray-700"
            />

            <SegmentPropertiesEditorPopup
              selectedIndex={index}
              deleteSegment={deleteSegment}
              updateSegment={updateSegment}
              totalWeight={totalWeight}
            />

            {/* Add Segment Button */}
            <button
              onClick={() => addSegment(index)}
              className="w-8 dark:bg-gray-700 "
            >
              <FaCopy size={18} />
            </button>

            {/* Delete Button */}
            <button
              onClick={() => deleteSegment(index)} // Delete the segment
              className="text-red-500 min-w-7 hover:text-red-700"
            >
              <FaTrashAlt size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* New Segment Button */}
      <Button onClick={addSegment} className="w-full mt-4 p-4">
        New Slice +
      </Button>
    </div>
  );
};

export default ScrollableSegmentsEditorAdv;
