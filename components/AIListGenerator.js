"use client";

import { useState, useRef, useEffect, useContext } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import { FaMagic } from "react-icons/fa";
import { useSession } from "next-auth/react";

const AIListGenerator = ({ setSegData }) => {
  const MAX_ALLOWED_WORDS_AFTER_LOGIN = 50;
  const MAX_ALLOWED_BEFORE_LOGIN = 10;
  const { html, setWheelTitle } = useContext(SegmentsContext);
  const { status, data: session } = useSession();
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [wordCount, setWordCount] = useState(MAX_ALLOWED_BEFORE_LOGIN);
  const [generatedWords, setGeneratedWords] = useState([]);
  const [textareaValue, setTextareaValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const modalRef = useRef(null);

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleWordCountChange = (event) => {
    setWordCount(Number(event.target.value));
  };

  const generateWords = async () => {
    setIsGenerating(true);
    try {
      // let message =
      //   wordCount > 10
      //     ? status === "authenticated"
      //       ? "You will be charged 5 coins for this query"
      //       : "Please login to generate more than 10 words"
      //     : "";
      if (status === "authenticated") {
        const response = await fetch(`${apiConfig.apiUrl}/ai/generate-list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, wordCount }),
        });

        const data = await response.json();
        setTextareaValue(data.words.join("\n"));
        setGeneratedWords(data.words);
      } else {
        setError("Please login to use AI List Generator!");
      }
    } catch (error) {
      setError(error ? error : "Error generating List!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseWords = () => {
    setIsModalOpen(false);
    setPrompt("");
    setWordCount(MAX_ALLOWED_BEFORE_LOGIN);
    setTextareaValue("");
    setSegData(generatedWords);
    html.current = generatedWords
      .map((perSegData) => `<div>${perSegData}</div>`)
      .join("");
    setWheelTitle(prompt);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setPrompt("");
    setWordCount(MAX_ALLOWED_BEFORE_LOGIN);
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
      <Button onClick={handleUseAI}>
        <span>
          <FaMagic size={15} className="mr-2" />
        </span>
        Use AI
      </Button>
      {isModalOpen && (
        <div className="z-50 fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div
            ref={modalRef}
            className="w-96 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            <h2 className="text-lg font-semibold mb-4">AI List Generator</h2>
            <input
              type="text"
              placeholder="Enter your prompt"
              value={prompt}
              onChange={handlePromptChange}
              className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Number of words"
              value={wordCount}
              onChange={handleWordCountChange}
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
              <Button
                onClick={generateWords}
                className="ml-2"
                disabled={isGenerating}
              >
                {isGenerating ? "Generating List.." : "Generate Words"}
              </Button>
              <Button
                variant="primary"
                onClick={handleUseWords}
                className="ml-2"
                disabled={generatedWords.length === 0}
              >
                Use Words
              </Button>
            </div>
            <div className="text-center">
              <p className="text-red-500 mt-2">{error ? error : ""}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIListGenerator;
