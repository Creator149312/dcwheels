"use client";

import { useContext, useEffect, useState } from "react";
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
  {
    name: "Argentina",
    colors: ["#75AADB", "#FFFFFF"], // Light blue and white
  },
  {
    name: "Australia",
    colors: ["#002868", "#FFFFFF", "#EF3340"], // Blue, white, and red
  },
  {
    name: "Brazil",
    colors: ["#009C3B", "#FFDF00", "#002776"], // Green, yellow, and blue
  },
  {
    name: "Canada",
    colors: ["#FF0000", "#FFFFFF"], // Red and white
  },
  {
    name: "China",
    colors: ["#FF0000", "#FFD700"], // Red and gold
  },
  {
    name: "France",
    colors: ["#002395", "#FFFFFF", "#ED2939"], // Blue, white, and red
  },
  {
    name: "Germany",
    colors: ["#000000", "#FFCC00", "#FF0000"], // Black, gold, and red
  },
  {
    name: "India",
    colors: ["#FF9933", "#FFFFFF", "#138808"], // Orange, white, and green
  },
  {
    name: "Indonesia",
    colors: ["#FF0000", "#FFFFFF"], // Red and white
  },
  {
    name: "Italy",
    colors: ["#009246", "#FFFFFF", "#CE2B37"], // Green, white, and red
  },
  {
    name: "Japan",
    colors: ["#BC002D", "#FFFFFF"], // Red and white
  },
  {
    name: "Republic of Korea",
    colors: ["#003478", "#FFFFFF", "#C60C30"], // Blue, white, and red
  },
  {
    name: "Mexico",
    colors: ["#006847", "#FFFFFF", "#CE1126"], // Green, white, and red
  },
  {
    name: "Russia",
    colors: ["#0039A6", "#FFFFFF", "#D52B1E"], // Blue, white, and red
  },
  {
    name: "Saudi Arabia",
    colors: ["#006C35", "#FFFFFF"], // Green and white
  },
  {
    name: "South Africa",
    colors: ["#007847", "#FFC72C", "#EF2B2D", "#000000", "#FFFFFF"], // Green, yellow, red, black, and white
  },
  {
    name: "Turkey",
    colors: ["#E30A17", "#FFFFFF"], // Red and white
  },
  {
    name: "United Kingdom",
    colors: ["#00247D", "#FFFFFF", "#CF142B"], // Blue, white, and red
  },
  {
    name: "United States",
    colors: ["#B22234", "#FFFFFF", "#3C3B6E"], // Red, white, and blue
  },
  {
    name: "European Union",
    colors: ["#003399", "#FFD700"], // Blue and gold
  },
  {
    name: "Medical Marvel",
    colors: ["#FFFFFF", "#1E90FF", "#008000"], // White, dodger blue, green
  },
  {
    name: "Corporate Office",
    colors: ["#000080", "#808080", "#FFFFFF"], // Navy blue, grey, white
  },
  {
    name: "Creative Studio",
    colors: ["#FFFF00", "#FF00FF", "#00FFFF"], // Yellow, magenta, cyan
  },
];

/**
 *
 * @returns a popup window for all the wheel settings like theme, spin duration and max number of segments to show
 */

const Settings = () => {
  const {
    handleSpinDurationChange,
    handleSegColorsChange,
    handleMaxNumberOfOptionsChange,
    handleWheelSettingsChange,
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
    // handleSegColorsChange(selectedTheme.colors);
    // handleMaxNumberOfOptionsChange(maxOptions);
    // handleSpinDurationChange(spinDuration);

    handleWheelSettingsChange({segColors: selectedTheme.colors,  maxNumberOfOptions: maxOptions, spinDuration});

    setIsOpen(false); // Close the modal after applying changes
  };

  //this is used when we import a wheel with preset settings
  useEffect(() => {
    setMaxOptions(wheelData.maxNumberOfOptions);
    setSelectedTheme({ name: "Current", colors: wheelData.segColors });
    setSpinDuration(wheelData.spinDuration);
  }, [wheelData]);

  return (
    <Tooltip text="Customize Wheel">
      <Button
        className="my-1 px-2 py-0 h-7 text-xs"
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
                  const theme =
                    e.target.value === "Current"
                      ? currentTheme
                      : themes.find((t) => t.name === e.target.value);
                  handleThemeChange(theme);
                }}
                value={selectedTheme.name}
                className="mt-2 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              >
                <option key={currentTheme.name} value={currentTheme.name}>
                  {" "}
                  {currentTheme.name}{" "}
                </option>
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
              <h3 className="text-lg font-medium">
                Spin Duration - {spinDuration}
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

            {/* Range Input for Size Adjustment */}
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
