"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { useContext, useState } from "react";
import { FaUpload } from "react-icons/fa";

const ImportLocalWheel = ({ afterImport }) => {
  const [error, setError] = useState(null);
  const { html, setWheelData } = useContext(SegmentsContext);

  // Handle importing JSON file
  const handleImport = (e) => {
    const file = e.target.files[0]; // Get the file selected by user
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // Parse the JSON data and pass it to parent component
          const importedData = JSON.parse(reader.result);
          setError(null);
          afterImport(importedData.data); // Pass data to parent component
          html.current = importedData.data
            .map((perSegData) => `<div>${perSegData}</div>`)
            .join("");

          setWheelData(importedData.wheelData);
        } catch (error) {
          setError("Invalid JSON file. Please upload a valid JSON.");
        }
      };
      reader.readAsText(file); // Read file as text
    } else {
      setError("Please upload a valid JSON file.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <label
        htmlFor="file-upload"
        className="flex h-10 items-center mx-1 text-sm font-medium cursor-pointer bg-gray-900 dark:bg-slate-200 dark:text-black text-white p-3 rounded-md hover:bg-gray-900 focus:outline-none"
      >
        {error ? (
          <span className="text-red-500">{error}</span>
        ) : (
          <>
            Import <FaUpload size={15} className="ml-1" />
          </>
        )}
      </label>
      <input
        id="file-upload"
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};

export default ImportLocalWheel;
