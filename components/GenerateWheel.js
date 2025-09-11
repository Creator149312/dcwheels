"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "@components/ui/button";
import { useSession } from "@node_modules/next-auth/react";
import { FaMagic } from "@node_modules/react-icons/fa";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { useContext, useState } from "react";
import { usePathname } from "next/navigation";

import toast from "react-hot-toast";
const HOME_URL = "https://www.spinpapa.com";

const GenerateWheel = () => {
  const { status, data: session } = useSession();
  const [prompt, setPrompt] = useState("");
  const [list, setList] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTxt, setLoadingTxt] = useState("Generating...");
  const [progress, setProgress] = useState(0);
  const currentPath = usePathname();
  const isHomepage = currentPath === "/";

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
    if (!prompt) {
      toast.error("Please Enter a Prompt!");
      return;
    }
    if (status !== "authenticated") {
      toast.error("Please login to use Smart Wheel Builder!");
      return;
    }

    setLoading(true);
    setProgress(10); // Start progress at 10% to simulate loading
    setLoadingTxt("Curating Awesome Wheel for You...");
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
      // console.log("DATA WORDS = " + data.words);
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

      setTimeout(() => {
        handleUseWords(data.words, colcodes.colorCodes);
      }, 1500);

      // Simulate progress to 100% as we render the list
      setProgress(100);
    } catch (error) {
      console.error(error);
      setProgress(0); // Reset progress on error
    } finally {
      setLoading(false);
      handleClosePopup();
    }
  };

  const handleClosePopup = () => {
    setIsPopupVisible(false); // Close popup when the user clicks "Close"
  };

  const handleOpenPopup = () => {
    setIsPopupVisible(true); // Show popup when "Smart Wheel" is clicked
  };

  return (
    <>
      {isHomepage && (
        <div className="relative">
          {/* Button to open popup */}
          <Button onClick={handleOpenPopup}>
            {" "}
            <span>
              <FaMagic size={15} className="mr-2" />
            </span>
            Smart Wheel
          </Button>
          {/* Popup Modal */}
          {isPopupVisible && (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-11/12 max-w-2xl shadow-lg overflow-y-auto space-y-6">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Smart Wheel Builder
                </h1>

                {/* Prompt input */}
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt in less than 25 words"
                  className="w-full p-3 rounded-md bg-gray-100 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Loading spinner + progress bar */}
                {loading && (
                  <div className="flex flex-col items-center space-y-4">
                    {/* Spinning image with height 50px (h-12 = 48px) */}
                    <img
                      src="/spin-wheel-logo.png"
                      alt="Loading"
                      className="h-12 animate-spin"
                    />

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {loadingTxt}
                    </p>
                  </div>
                )}
                {/* Buttons: Horizontal layout */}
                <div className="flex justify-start space-x-4">
                  <button
                    onClick={handleGenerateClick}
                    disabled={loading}
                    className="py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 dark:bg-blue-600 dark:hover:bg-blue-700 transition"
                  >
                    {loading ? "Generating.." : "Generate"}
                  </button>
                  {!loading && (
                    <button
                      onClick={handleClosePopup}
                      className="py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default GenerateWheel;
