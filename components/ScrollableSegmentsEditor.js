"use client";

import { useContext, useEffect, useState } from "react";
import Settings from "@components/Settings";
import ImageUpload from "@components/ImageUpload";
import { FaTrash, FaTrashAlt } from "react-icons/fa";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import { isImageElement } from "@utils/HelperFunctions";
import SegmentPropertiesEditorPopup from "./SegmentPropertiesEditorPopup";

const ScrollableSegmentsEditor = ({
  dataSegments,
  setSegmentsData,
  setSegTxtData,
}) => {
  // console.log("Data Segments");
  // console.log(dataSegments);
  const { html } = useContext(SegmentsContext);





  // Function to extract data from the given array and update divs
  const updateDivsFromJson = (jsonArray) => {
    return jsonArray.map((item, index) => {
      const IfImageData = isImageElement(item.option);
      if (IfImageData.isValid) {
        const div = {
          id: index + 1,
          text: "", // Extracting text from option
          color: item.style?.backgroundColor || "#f8f9fa", // Extracting color from style
          size: item.optionSize, // Default size (this can be modified if needed)
          image: IfImageData.src || null, // Extracting image uri, if it exists
        };
        return div;
      } else {
        const div = {
          id: index + 1,
          text: item.option || "Default Text", // Extracting text from option
          color: item.style?.backgroundColor || "#f8f9fa", // Extracting color from style
          size: item.optionSize, // Default size (this can be modified if needed)
          image: item.image?.uri || null, // Extracting image uri, if it exists
        };
        return div;
      }
    });
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

  const addSegment = () => {
    setDivs((prevDivs) => [
      ...prevDivs,
      {
        id: prevDivs.length + 1, // Unique ID for the new div
        text: "Default Text",
        color: "#f8f9fa",
        size: 1,
        image: null,
      },
    ]);
  };

  const [divs, setDivs] = useState(updateDivsFromJson(dataSegments));

  const updateEditorContents = (updateSegmentsData) => {
    let updatedHTML = "";
    setSegTxtData(
      updateSegmentsData.map((item) => {
        if (item.option === null) {
          let imageComp = `<img src="${item.image.uri}" width="50" height="50" />`;
          updatedHTML += `<div>${imageComp}</div>`;
          return imageComp;
        } else {
          updatedHTML += `<div>${item.option}</div>`;
          return item.option;
        }
      })
    );

    html.current = updatedHTML;
  };

  useEffect(() => {
    // Call the function with the JSON input (you can call this function based on some event like button click)
    let updateSegmentsData = getJsonArrayFromDivs();

    // console.log("Update Segments Data = ", updateSegmentsData);
    setSegmentsData(updateSegmentsData);
    updateEditorContents(updateSegmentsData);
    setTotalWeight(calculateTotalWeight(divs));
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

    
  const calculateTotalWeight = (DataDivs) => {
    return DataDivs.reduce((totalWgt, CurrentObject) => {
      return totalWgt + Number(CurrentObject.size);
    }, 0);
  };

  const [totalWeight, setTotalWeight] = useState(calculateTotalWeight(divs));
  console.log("Total Weight = ",calculateTotalWeight(divs));

  return (
    <div className="space-y-4">
      {/* Scrollable area for editing divs */}
      <div className="overflow-y-auto md:h-72 h-64 bg-white dark:bg-gray-800 rounded-sm shadow-md">
        {/* <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Edit Div Settings
        </h2> */}
        {divs.map((div) => (
          <div
            key={div.id}
            className="flex items-center space-x-2 mt-2 bg-gray-100 dark:bg-gray-700 py-1 px-1 shadow-md"
          >
            {/* Input Field for Div Text */}
            <input
              type="text"
              value={div.text}
              onChange={(e) => handleTextChange(div.id, e.target.value)} // Update the text for the div with matching id
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
              placeholder="Enter text"
            />

            {/* Color Picker for Div Background */}
            <input
              type="color"
              value={div.color}
              onChange={(e) => handleColorChange(div.id, e.target.value)} // Update the color for the div with matching id
              className="min-w-5 h-6 border border-gray-300 dark:border-gray-600"
            />
            <input
              type="input"
              value={div.size}
              onChange={(e) => handleWeightChange(div.id, e.target.value)}
              className="w-7 dark:bg-gray-700 dark:ring-2 dark:ring-gray-600"
            />
            {/* Image Upload Button */}
            <ImageUpload divId={div.id} setDivs={setDivs} currentDivs={divs} />
            <SegmentPropertiesEditorPopup
              divId={div.id}
              setDivs={setDivs}
              currentDivs={divs}
              handleDeleteDiv={handleDeleteDiv}
              handleColorChange={handleColorChange}
              handleTextChange={handleTextChange}
              handleWeightChange={handleWeightChange}
              totalWeight={totalWeight}
            />
            {/* Delete Button */}
            <button
              onClick={() => handleDeleteDiv(div.id)} // Delete the div with the matching id
              className="text-red-500 min-w-7 hover:text-red-700"
            >
              <FaTrashAlt size={20} />
            </button>
          </div>
        ))}
      </div>
      <Button onClick={addSegment} className="w-full mt-4 p-4">
        New Slice +
      </Button>
    </div>
  );
};

export default ScrollableSegmentsEditor;
