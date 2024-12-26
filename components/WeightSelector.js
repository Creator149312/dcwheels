import React, { useState } from 'react';
import { FaWeightHanging } from "react-icons/fa";

const WeightSelector = () => {
  const [isVisible, setIsVisible] = useState(false); // State to toggle visibility
  const [size, setSize] = useState(150); // Initial value for range

  // Handle change for range input
  const handleSizeChange = (e) => {
    setSize(e.target.value); // Update size when range value changes
  };

  // Toggle visibility of the range input div
  const toggleVisibility = () => {
    setIsVisible(!isVisible); // Toggle visibility
  };

  return (
    <div>
      <button 
        onClick={toggleVisibility} 
        className="py-2 px-4 bg-blue-500 text-white rounded-md mb-4"
      >
        {isVisible ? <FaWeightHanging /> : <FaWeightHanging />}
      </button>

      {isVisible && (
        <div className="mt-4">
          <h3 className="text-lg font-medium">Adjust Size</h3>
          <input
            type="input"
            value={size}
            onChange={handleWeightChange}
            className="w-full dark:bg-gray-700 dark:ring-2 dark:ring-gray-600"
          />
     
        </div>
      )}

    </div>
  );
};

export default WeightSelector;
