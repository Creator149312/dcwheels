"use client";

import { useState } from "react";
import Settings from "@components/Settings";
import ImageUpload from "@components/ImageUpload";

const Home = () => {
  const [divs, setDivs] = useState(
    Array(5)
      .fill(null)
      .map((_, index) => ({
        id: index + 1, // Unique ID for each div (1, 2, 3, 4, 5)
        text: "Default Text",
        color: "#f8f9fa",
        size: 100,
        image: null,
      }))
  );

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

  // Handle delete for a specific div
  const handleDeleteDiv = (id) => {
    setDivs((prevDivs) => prevDivs.filter((div) => div.id !== id)); // Remove the div with the matching ID
  };

  return (
    <div className="space-y-4">
      {/* Settings Button */}
      <Settings divs={divs} setDivs={setDivs} />

      {/* Scrollable area for editing divs */}
      <div className="overflow-y-auto max-h-[400px] p-4 bg-white dark:bg-gray-800 rounded-md shadow-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Edit Div Settings
        </h2>
        {divs.map((div) => (
          <div
            key={div.id}
            className="flex items-center space-x-4 mb-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-md shadow-sm"
          >
            {/* Input Field for Div Text */}
            <input
              type="text"
              value={div.text}
              onChange={(e) => handleTextChange(div.id, e.target.value)} // Update the text for the div with matching id
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
              placeholder="Enter text"
            />

            {/* Color Picker for Div Background */}
            <input
              type="color"
              value={div.color}
              onChange={(e) => handleColorChange(div.id, e.target.value)} // Update the color for the div with matching id
              className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-md"
            />

            {/* Image Upload Button */}
            <ImageUpload divId={div.id} setDivs={setDivs} />

            {/* Delete Button */}
            <button
              onClick={() => handleDeleteDiv(div.id)} // Delete the div with the matching id
              className="text-red-500 hover:text-red-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Display the divs on the page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
};

export default Home;
