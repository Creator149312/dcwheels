"use client";

import { useContext, useState } from "react";
import { AiOutlineClose } from "react-icons/ai"; // Close icon for modal
import { FaTools } from "react-icons/fa";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import Tooltip from "./Tooltip";

const themes = [
  {
    name: "Vibrant Sunset",
    colors: ["#FF5733", "#FF8D1A", "#FFBD33", "#FFDF33", "#FFD700"], // Warm oranges and yellows
  },
  {
    name: "Ocean Breeze",
    colors: ["#0099FF", "#00BFFF", "#1E90FF", "#00CED1", "#7FFFD4"], // Blues and turquoise tones
  },
  {
    name: "Tropical Paradise",
    colors: ["#FF1493", "#FF6347", "#FF4500", "#32CD32", "#FFD700"], // Bright pink, orange, green, yellow
  },
  {
    name: "Neon Lights",
    colors: ["#39FF14", "#FF007F", "#00FFFF", "#FFFC00", "#FF6600"], // Neon green, pink, cyan, yellow, and orange
  },
  {
    name: "Electric Purple",
    colors: ["#8A2BE2", "#9B30FF", "#9400D3", "#DA70D6", "#FF00FF"], // Shades of purple, violet, and magenta
  },
  {
    name: "Rainbow",
    colors: [
      "#FF0000",
      "#FF7F00",
      "#FFFF00",
      "#00FF00",
      "#0000FF",
      "#4B0082",
      "#8B00FF",
    ], // Full spectrum of rainbow colors
  },
  {
    name: "Cyberpunk",
    colors: ["#FF00FF", "#00FF00", "#00FFFF", "#FF00CC", "#FFFF00"], // Bright cyberpunk neon colors
  },
  {
    name: "Sunset Beach",
    colors: ["#FF4500", "#FF6347", "#FF7F50", "#FF8C00", "#FFD700"], // Sunset oranges, reds, and yellows
  },
  {
    name: "Electric Blue",
    colors: ["#00BFFF", "#1E90FF", "#4169E1", "#0000FF", "#00008B"], // Different shades of blue with some vibrant highlights
  },
  {
    name: "Tropical Sunset",
    colors: ["#F56B00", "#FF4500", "#FF6347", "#FFD700", "#FF8C00"], // A warm tropical sunset palette with oranges and reds
  },
];

const Settings = () => {
  const { handleSpinDurationChange, handleSegColorsChange , wheelData} =
  useContext(SegmentsContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(themes[0]);
  const [spinDuration, setSpinDuration] = useState(wheelData.spinDuration); // Size default to 1.0 (maximum size)

  // Handle theme change
  const handleThemeChange = (theme) => {
    setSelectedTheme(theme);
    handleSegColorsChange(theme.colors);
  };

  // Handle size change
  const onSpinDurationChange = (e) => {
    setSpinDuration(parseFloat(e.target.value));
  };

  // Handle close modal
  const handleClose = () => setIsOpen(false);

  // Handle apply changes
  const handleApply = () => {
    // Apply changes here (e.g., set the new theme and spin duration to context or global state)
    handleSpinDurationChange(spinDuration);
    setIsOpen(false); // Close the modal after applying changes
  };

  return (
    <Tooltip text="Customize Wheel">
      <Button
        className="mx-1 my-1 py-0 h-7 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <FaTools size={20} />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-10 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96 dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400"
              >
                <AiOutlineClose size={20} />
              </button>
            </div>

            {/* Theme Selection with Drop-down */}
            <div className="mt-4">
              <h3 className="text-lg font-medium">Select Theme</h3>
              <select
                onChange={(e) => {
                  const theme = themes.find((t) => t.name === e.target.value);
                  handleThemeChange(theme);
                }}
                value={selectedTheme.name}
                className="mt-2 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              >
                {themes.map((theme) => (
                  <option key={theme.name} value={theme.name}>
                    {theme.name}
                  </option>
                ))}
              </select>

              {/* Grid of colors for the selected theme */}
              <div className="mt-2 grid grid-cols-5 gap-2">
                {selectedTheme.colors.map((color, index) => (
                  <div
                    key={index}
                    className="h-8 rounded-md"
                    style={{
                      backgroundColor: color,
                      border: "1px solid #ddd",
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Range Input for Size Adjustment */}
            <div className="mt-4">
              <h3 className="text-lg font-medium">Spin Duration</h3>
              <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={spinDuration}
                onChange={onSpinDurationChange}
                className="w-full mt-2 h-2 bg-gray-200 rounded-lg dark:bg-gray-600"
              />
              <div className="flex justify-between text-sm mt-2">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>
            {/* Cancel and Apply Buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <Button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Apply
              </Button>
            </div>
            {/* Additional Settings (e.g., Image Upload, etc.) */}
            {/* Uncomment and implement as necessary */}
          </div>
        </div>
      )}
    </Tooltip>
  );
};

export default Settings;
