"use client";

import { useContext, useEffect, useState } from "react";
import { AiOutlineClose } from "react-icons/ai"; // Close icon for modal
import { FaTools, FaTrashAlt } from "react-icons/fa";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import Tooltip from "./Tooltip";
import ImageUpload from "./ImageUpload";
import HideSegmentCheckbox from "./HideSegmentCheckbox";

/**
 *
 * @returns a popup window for all the wheel settings like theme, spin duration and max number of segments to show
 */

const SegmentPropertiesEditorPopup = ({
  selectedIndex,
  updateSegment,
  deleteSegment,
  totalWeight,
}) => {
  const {
    wheelData,
    segData,
    setSegData,
    MAX_OPTIONS_ON_WHEEL,
    MAX_SPIN_TIME,
  } = useContext(SegmentsContext);
  const [isOpen, setIsOpen] = useState(false);

  // Handle close modal
  const handleClose = () => setIsOpen(false);

  // Handle apply changes
  const handleApply = () => {
    setIsOpen(false); // Close the modal after applying changes
  };

  return (
    <>
      <button className="my-1 py-0 h-7 text-xs" onClick={() => setIsOpen(true)}>
        <FaTools size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-10 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96 dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Segment Settings</h3>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400"
              >
                <AiOutlineClose size={20} />
              </button>
            </div>

            {/* Map over segData to render each segment */}
            {segData.map((segment, index) => index === selectedIndex && (
              <div
                key={index}
                className="flex flex-col mt-2 dark:bg-gray-800 py-1 px-1"
              >
                {/* Input Field for Segment Text */}
                <div className="mt-4">
                  <h4 className="text-lg font-medium">Segment Text</h4>
                  <input
                    type="text"
                    value={segment.text}
                    onChange={(e) =>
                      updateSegment(index, "text", e.target.value)
                    } // Update text for the segment
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    placeholder="Enter text of Segment"
                  />
                </div>

                {/* Color Picker for Segment Background */}
                <div className="mt-4">
                  <h4 className="text-lg font-medium">Color for Segment</h4>
                  <input
                    type="color"
                    value={segment.color}
                    onChange={(e) =>
                      updateSegment(index, "color", e.target.value)
                    } // Update color for the segment
                    className="w-full h-10 border border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Weight Range Slider */}
                <div className="mt-4">
                  <h4 className="text-lg font-medium flex flex-row justify-between">
                    <span>Weight </span>
                    <span>
                      Probability ={" "}
                      {Number((segment.weight / totalWeight).toFixed(2))}{" "}
                    </span>
                  </h4>
                  <input
                    type="range"
                    value={segment.weight}
                    min={1}
                    step={1}
                    max={totalWeight}
                    onChange={(e) => 
                      updateSegment(index, "weight", e.target.value)
                    } // Update weight for the segment
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  />
                </div>

                {/* Image Upload */}
                <div className="mt-4 flex flex-row justify-between">
                  <h4 className="text-lg font-medium">Image for Segment</h4>
                  <ImageUpload
                    selectedIndex={index}
                    setSegData={setSegData}
                    segData={segData}
                  />
                </div>

                {/* Visibility Checkbox */}
                <div className="mt-4 flex flex-row justify-between">
                  <h4 className="text-lg font-medium">Visible</h4>
                  <input
                    type="checkbox"
                    checked={segment.visible}
                    onChange={(e) =>
                      updateSegment(index, "visible", e.target.checked)
                    } // Update visibility for the segment
                    className="w-8 dark:bg-gray-700 dark:ring-2 dark:ring-gray-600"
                  />
                </div>

                {/* Delete Segment Button */}
                <button
                  onClick={() => deleteSegment(index)} // Delete the segment
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrashAlt size={20} />
                </button>
              </div>
            ))}

            {/* Cancel and Apply Buttons */}
            <div className="mt-6 flex justify-between space-x-4">
              <Button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SegmentPropertiesEditorPopup;
