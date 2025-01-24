"use client";

import { useContext, useEffect, useState } from "react";
import { AiOutlineClose } from "react-icons/ai"; // Close icon for modal
import { FaTools, FaTrashAlt } from "react-icons/fa";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import Tooltip from "./Tooltip";
import ImageUpload from "./ImageUpload";

/**
 *
 * @returns a popup window for all the wheel settings like theme, spin duration and max number of segments to show
 */

const SegmentPropertiesEditorPopup = ({
  divId,
  setDivs,
  currentDivs,
  handleDeleteDiv,
  handleColorChange,
  handleTextChange,
  handleWeightChange,
  totalWeight
}) => {
  const {
    handleSpinDurationChange,
    handleSegColorsChange,
    handleMaxNumberOfOptionsChange,
    wheelData,
    MAX_OPTIONS_ON_WHEEL,
    MAX_SPIN_TIME,
  } = useContext(SegmentsContext);
  const [isOpen, setIsOpen] = useState(false);
  const currentTheme = { name: "Current", colors: wheelData.segColors };
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [spinDuration, setSpinDuration] = useState(wheelData.spinDuration); // Size default to 1.0 (maximum size)
  const [maxOptions, setMaxOptions] = useState(wheelData.maxNumberOfOptions);
  

  // Handle theme change
  const handleThemeChange = (theme) => {
    setSelectedTheme(theme);
  };

  // Handle size change
  const onSpinDurationChange = (e) => {
    setSpinDuration(parseInt(e.target.value));
  };

  // Handle options size change
  const onMaxOptionsChange = (e) => {
    setMaxOptions(parseInt(e.target.value));
  };

  // Handle close modal
  const handleClose = () => setIsOpen(false);

  // Handle apply changes
  const handleApply = () => {
    // Apply changes here (e.g., set the new theme and spin duration to context or global state)
    handleSegColorsChange(selectedTheme.colors);
    handleMaxNumberOfOptionsChange(maxOptions);
    handleSpinDurationChange(spinDuration);

    setIsOpen(false); // Close the modal after applying changes
  };

  //this is used when we import a wheel with preset settings
  useEffect(() => {
    setMaxOptions(wheelData.maxNumberOfOptions);
    setSelectedTheme({ name: "Current", colors: wheelData.segColors });
    setSpinDuration(wheelData.spinDuration);
  }, [wheelData]);

  return (
    <>
      <button className="my-1 py-0 h-7 text-xs" onClick={() => setIsOpen(true)}>
        <FaTools size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-10 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96 dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Segment Settings</h2>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400"
              >
                <AiOutlineClose size={20} />
              </button>
            </div>

            {currentDivs.map(
              (div) =>
                div.id === divId && (
                  <div
                    key={divId}
                    className="flex flex-col mt-2 dark:bg-gray-700 py-1 px-1"
                  >
                    {/* Input Field for Div Text */}

                    <div className="mt-4">
                      <h3 className="text-lg font-medium">Segment Text</h3>
                      <input
                        type="text"
                        value={div.text}
                        onChange={(e) =>
                          handleTextChange(div.id, e.target.value)
                        } // Update the text for the div with matching id
                        className="mt-2 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                        placeholder="Enter text of Segment"
                      />
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-medium">Color for Segment</h3>
                      {/* Color Picker for Div Background */}
                      <input
                        type="color"
                        value={div.color}
                        onChange={(e) =>
                          handleColorChange(div.id, e.target.value)
                        } // Update the color for the div with matching id
                        className="w-full h-10 border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-medium flex flex-row justify-between">
                        <span>Weight </span>
                         <span>Probability = {Number((div.size / totalWeight).toFixed(2))} </span>
                      </h3>
                      <input
                        type="range"
                        value={div.size}
                        min={1}
                        step={1}
                        max={totalWeight}
                        onChange={(e) =>
                          handleWeightChange(div.id, e.target.value)
                        }
                        className="mt-2 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                      />
                    </div>
                    <div className="mt-4 flex flex-row justify-between">
                      <h3 className="text-lg font-medium">Image for Segment</h3>
                      {/* Image Upload Button */}
                      <ImageUpload
                        divId={div.id}
                        setDivs={setDivs}
                        currentDivs={currentDivs}
                      />
                    </div>

                    {/* Delete Button */}
                  </div>
                )
            )}

            {/*            
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                Weight - {divId.size}
              </h3>
              <input
                type="range"
                min="1"
                max={MAX_SPIN_TIME}
                step="1"
                value={spinDuration}
                onChange={onSpinDurationChange}
                className="w-full mt-2 h-2 bg-gray-200 rounded-lg dark:bg-gray-600"
              />
              <div className="flex justify-between text-sm mt-2">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-medium">
                Max number of Options on Wheel - {maxOptions}
              </h3>
              <input
                type="range"
                min="4"
                max={MAX_OPTIONS_ON_WHEEL}
                step="1"
                value={maxOptions}
                onChange={onMaxOptionsChange}
                className="w-full mt-2 h-2 bg-gray-200 rounded-lg dark:bg-gray-600"
              />
              <div className="flex justify-between text-sm mt-2">
                <span>4</span>
                <span>100</span>
              </div>
            </div> */}
            {/* Cancel and Apply Buttons */}
            <div className="mt-6 flex justify-between space-x-4">
              <button
                onClick={() => handleDeleteDiv(div.id)} // Delete the div with the matching id
                className="text-red-500 hover:text-red-700"
              >
                <FaTrashAlt size={20} />
              </button>
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
