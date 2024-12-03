"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { useContext, useState } from "react";
import { FaUpload } from "react-icons/fa";
import Tooltip from "./Tooltip";

const ImportLocalWheel = ({ afterImport }) => {
  const [error, setError] = useState(null);
  const { html } = useContext(SegmentsContext);

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
    <>
      <label
        htmlFor="file-upload"
        className="cursor-pointer mx-1 bg-gray-900 dark:bg-slate-200 dark:text-black text-white p-3 rounded-md hover:bg-gray-900 focus:outline-none"
      >
        {error ? (
          <span className="text-red-500">{error}</span>
        ) : (
          <FaUpload size={20} />
        )}
      </label>
      <input
        id="file-upload"
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </>
  );
};

export default ImportLocalWheel;
