"use client";

import { useEffect, useState } from "react";
import Settings from "@components/Settings";
import ImageUpload from "@components/ImageUpload";
import { FaTrash, FaTrashAlt } from "react-icons/fa";

const ScrollableSegmentsEditor = ({
  dataSegments,
  setSegmentsData,
  setSegTxtData,
}) => {
  const [divs, setDivs] = useState(
    Array(5)
      .fill(null)
      .map((_, index) => ({
        id: index + 1, // Unique ID for each div (1, 2, 3, 4, 5)
        text: "Default Text",
        color: "#f8f9fa",
        size: 1,
        image: null,
      }))
  );

  // Function to extract data from the given array and update divs
  const updateDivsFromJson = (jsonArray) => {
    const updatedDivs = jsonArray.map((item, index) => {
      const div = {
        id: index + 1,
        text: item.option || "Default Text", // Extracting text from option
        color: item.style?.backgroundColor || "#f8f9fa", // Extracting color from style
        size: item.optionSize, // Default size (this can be modified if needed)
        image: item.image?.uri || null, // Extracting image uri, if it exists
      };
      return div;
    });

    // Set the updated divs state
    setDivs(updatedDivs);
  };

  // Function to get the JSON array from the current divs state
  const getJsonArrayFromDivs = () => {
    return divs.map((div) => ({
      option: div.text, // Div text
      style: { backgroundColor: div.color }, // Div background color
      image: div.image
        ? { uri: div.image, sizeMultiplier: 0.5 } // Image info (with a fixed sizeMultiplier)
        : undefined, // If there's no image, the image property is omitted
      optionSize: div.size,
    }));
  };

  useEffect(() => {
    // Call the function with the JSON input (you can call this function based on some event like button click)
    updateDivsFromJson(dataSegments);
  }, []);

  useEffect(() => {
    // Call the function with the JSON input (you can call this function based on some event like button click)
    let updateSegmentsData = getJsonArrayFromDivs();
    setSegmentsData(updateSegmentsData);
    setSegTxtData(updateSegmentsData.map((item) => item.option));
  }, [divs]);

  // Handle text changes for a specific div
  const handleTextChange = (id, text) => {
    setDivs((prevDivs) =>
      prevDivs.map(
        (div) => (div.id === id ? { ...div, text } : div) // Only update the div with the matching ID
      )
    );
  };

  // Handle color change for a specific div
  const handleColorChange = (id, color) => {
    setDivs((prevDivs) =>
      prevDivs.map(
        (div) => (div.id === id ? { ...div, color } : div) // Only update the div with the matching ID
      )
    );
  };

  const handleWeightChange = (id, size) => {
    setDivs((prevDivs) =>
      prevDivs.map(
        (div) => (div.id === id ? { ...div, size } : div) // Only update the div with the matching ID
      )
    );
  };

  // Handle delete for a specific div
  const handleDeleteDiv = (id) => {
    setDivs((prevDivs) => prevDivs.filter((div) => div.id !== id)); // Remove the div with the matching ID
  };

  return (
    <div className="space-y-4">
      {/* Scrollable area for editing divs */}
      <div className="overflow-y-auto md:h-72 h-64 p-2 bg-white dark:bg-gray-800 rounded-md shadow-md">
        {/* <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Edit Div Settings
        </h2> */}
        {divs.map((div) => (
          <div
            key={div.id}
            className="flex items-center space-x-2 mb-2 bg-gray-100 dark:bg-gray-700 py-2 px-1 rounded-md shadow-sm"
          >
            {/* Input Field for Div Text */}
            <input
              type="text"
              value={div.text}
              onChange={(e) => handleTextChange(div.id, e.target.value)} // Update the text for the div with matching id
              className="w-full px-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
              placeholder="Enter text"
            />

            {/* Color Picker for Div Background */}
            <input
              type="color"
              value={div.color}
              onChange={(e) => handleColorChange(div.id, e.target.value)} // Update the color for the div with matching id
              className="w-10 h-5 border border-gray-300 dark:border-gray-600 rounded-md"
            />
            <input
              type="input"
              value={div.size}
              onChange={(e) => handleWeightChange(div.id, e.target.value)}
              className="w-5 dark:bg-gray-700 dark:ring-2 dark:ring-gray-600"
            />
            {/* Image Upload Button */}
            <ImageUpload divId={div.id} setDivs={setDivs} />

            {/* Delete Button */}
            <button
              onClick={() => handleDeleteDiv(div.id)} // Delete the div with the matching id
              className="text-red-500 hover:text-red-700"
            >
              <FaTrashAlt size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Display the divs on the page */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {divs.map((div) => (
          <div
            key={div.id}
            style={{
              backgroundColor: div.color,
              width: `${div.size}%`,
              height: `${div.size}%`,
            }}
            className="border rounded-md p-4"
          >
            <p>{div.text}</p>
            {div.image && (
              <img
                src={div.image}
                alt="Div Image"
                className="mt-2 w-full h-auto object-cover"
              />
            )}
          </div>
        ))}
      </div> */}
    </div>
  );
};

export default ScrollableSegmentsEditor;
