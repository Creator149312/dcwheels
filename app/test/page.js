"use client";

import React, { useState, useRef, useEffect } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { Button } from "@components/ui/button";
import toast from "react-hot-toast";
import { validateListDescription, validateListTitle } from "@utils/Validator";

const AIListGenerator = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [wheelJSON, setWheelJSON] = useState(null);
  const [generatedWords, setGeneratedWords] = useState([]);
  const [textareaValue, setTextareaValue] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useRef(null);

  const MAX_OPTIONS_ON_WHEEL = 100;
  const INNER_RADIUS = 15;
  const MAX_SPIN_TIME = 10;

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const generateWords = async () => {
    try {
      const response = await fetch(`${apiConfig.apiUrl}/ai/generate-json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      const dataForUsage = data.words.replace('```json{', '').replace('}```', '');
      console.log("DAta for Usage", dataForUsage)
      console.log("DATA = ", data.words);
      setWheelJSON(data.words);
      setTextareaValue(data.words);
    } catch (error) {
      console.error("Error generating JSON:", error);
    }
  };

  const handleSaveWheel = async () => {
    setError("");
    setIsSaving(true);

    console.log("Wheel JSON = ", wheelJSON);
    console.log("Wheel Title: ", wheelJSON.title);
    console.log("Wheel Description = ", wheelJSON.description);

    // let vlt = validateListTitle(wheelJSON.title);
    // let vld = validateListDescription(wheelJSON.description);

    // if (vlt.length !== 0) {
    //   setError(vlt);
    //   setisSaving(false);
    //   return;
    // }
    // if (vld.length !== 0) {
    //   setError(vld);
    //   setisSaving(false);
    //   return;
    // }

    let selectedUserID = "gauravsingh9314@gmail.com";
    let defaultWheelData = {
      segColors: [
        "#EE4040",
        "#F0CF50",
        "#815CD1",
        "#3DA5E0",
        "#34A24F",
        "#F9AA1F",
        "#EC3F3F",
        "#FF9000",
      ],
      spinDuration: MAX_SPIN_TIME / 2,
      maxNumberOfOptions: MAX_OPTIONS_ON_WHEEL, //this is max number of options to show on wheel
      innerRadius: INNER_RADIUS,
    };

    try {
      // if (selectedUserID) {
      //   const res = await fetch(`${apiConfig.apiUrl}/wheel`, {
      //     method: "PUT",
      //     headers: {
      //       "Content-type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       title,
      //       description,
      //       data: wheelJSON.segments,
      //       wheelData: defaultWheelData,
      //       content: wheelJSON.content,
      //       category: wheelJSON.category,
      //       createdBy: selectedUserID
      //     }),
      //   });

      //   let resObj = await res.json();

      //   if (resObj?.error) {
      //     setError("Failed to Update a wheel");
      //     toast.error("Failed to Update Wheel");
      //   } else {
      //     router.push("/dashboard");
      //   }
      // } 
    } catch (error) {
      setError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setPrompt("");
    setTextareaValue("");
  };

  const handleUseAI = () => {
    setIsModalOpen(true);
  };

  const handleOutsideClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div>
      <Button onClick={handleUseAI}>Use AI</Button>
      {isModalOpen && (
        <div className="z-50 fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div
            ref={modalRef}
            className="w-96 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            <h2 className="text-lg font-semibold mb-4">
              OpenAI Word Generator
            </h2>
            <input
              type="text"
              placeholder="Enter your prompt"
              value={prompt}
              onChange={handlePromptChange}
              className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={textareaValue}
              readOnly
              className="w-full border border-gray-300 rounded-md p-2 mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={generateWords} className="ml-2">
                Generate JSON
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveWheel}
                className="ml-2"
              >
                {isSaving ? 'Saving JSON..' : 'Use JSON'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIListGenerator;
