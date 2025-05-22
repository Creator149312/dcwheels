"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { useContext, useState } from "react";

const GenerateWheel = () => {
  const [prompt, setPrompt] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTxt, setLoadingTxt] = useState("Generating...");
  const [progress, setProgress] = useState(0);
  const { setSegData, html, handleWheelSettingsChange, wheelData } =
    useContext(SegmentsContext);
  const [isPopupVisible, setIsPopupVisible] = useState(false); // State to control the popup visibility

  const handleUseWords = (generatedWords, colorCodes) => {
    const toJSONArray = ensureArrayOfObjects(generatedWords);
    setSegData(toJSONArray);
    html.current = toJSONArray
      .map((perSegData) => `<div>${perSegData.text}</div>`)
      .join("");

    handleWheelSettingsChange({ segColors: colorCodes });
  };

  const handleGenerateClick = async () => {
    if (!prompt) return;

    setLoading(true);
    setProgress(10); // Start progress at 10% to simulate loading
    setLoadingTxt("Curating List for You...");
    try {
      const wordCount = 10;
      // Start API call
      const response = await fetch("/api/ai/generate-wheel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, wordCount }),
      });

      // Simulate progress update to 50% when API response is received
      setProgress(40);

      if (!response.ok) {
        throw new Error("Failed to generate list");
      }

      const data = await response.json();

      // Simulate progress to 100% as we render the list
      setProgress(60);
      setList(data.words); // Assume response is { words: [...] }

      const colorCodes = await fetch("/api/ai/generate-theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const colcodes = await colorCodes.json();

      // Simulate progress to 100% as we render the list
      setProgress(80);
      
      const imgURL = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const imageData = await imgURL.json();
      console.log("image URL = ", imageData.imageUrl);

      setTimeout(() => {
        handleUseWords(data.words, colcodes.colorCodes);
      }, 1500);
    } catch (error) {
      console.error(error);
      setProgress(0); // Reset progress on error
    } finally {
      setLoading(false);
    }
  };

  const handleClosePopup = () => {
    setIsPopupVisible(false); // Close popup when the user clicks "Close"
  };

  const handleOpenPopup = () => {
    setIsPopupVisible(true); // Show popup when "Smart Wheel" is clicked
  };

  return (
    <div className="relative">
      {/* Button to open popup */}
      <button
        onClick={handleOpenPopup}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800"
      >
        Smart Wheel
      </button>

      {/* Popup Modal */}
      {isPopupVisible && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-11/12 max-w-2xl overflow-y-auto">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Generate List
            </h1>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt"
              className="mt-4 w-full p-3 rounded-md bg-gray-100 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGenerateClick}
              disabled={loading}
              className="mt-4 w-full py-3 px-6 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {loading ? loadingTxt : "Generate"}
            </button>

            {/* Progress bar */}
            {loading && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 mt-4">
                <div
                  className="h-2 bg-green-500 transition-all ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}

            {/* Render the list of items */}
            {/* <ul className="mt-4 text-gray-900 dark:text-white">
              {list.length > 0 &&
                list.map((item, index) => <li key={index}>{item}</li>)}
            </ul> */}

            {/* Close button */}
            <button
              onClick={handleClosePopup}
              className="mt-6 w-full py-2 bg-red-500 text-white rounded-md hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateWheel;
