"use client";
import { useState, useRef } from "react";

export default function Home() {
  const [output, setOutput] = useState("");
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [input3, setInput3] = useState("");
  const [format, setFormat] = useState("{1} in {2} {1} {3} {2}");
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const fileInputRef3 = useRef(null);

  const generateOutput = () => {
    const arr1 = input1.split(",").map((item) => item.trim());
    const arr2 = input2.split(",").map((item) => item.trim());
    const arr3 = input3.split(",").map((item) => item.trim());

    if (arr1.length === 0 || arr2.length === 0) {
      alert("Please provide at least two input lists.");
      return;
    }

    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const countOccurrences = (str, placeholder) => {
      // Escape curly braces in the placeholder
      const escapedPlaceholder = placeholder.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(escapedPlaceholder, "g");
      const matches = str.matchAll(regex);
      return Array.from(matches).length; // Count the matches
    };

    const num1 = countOccurrences(format, "{1}");
    const num2 = countOccurrences(format, "{2}");
    const num3 = countOccurrences(format, "{3}");

    const arr1Instances = Array(num1);
    const arr2Instances = Array(num2);
    const arr3Instances = Array(num3);

    for (let i = 0; i < num1; i++) {
      arr1Instances[i] = getRandomItem(arr1);
    }
    for (let i = 0; i < num2; i++) {
      arr2Instances[i] = getRandomItem(arr2);
    }
    for (let i = 0; i < num3; i++) {
      arr3Instances[i] = arr3.length > 0 ? getRandomItem(arr3) : "";
    }

    let output = format;
    let index1 = 0;
    let index2 = 0;
    let index3 = 0;

    output = output.replace(/\{1\}/g, () => arr1Instances[index1++] || ""); // Handle potential undefined
    output = output.replace(/\{2\}/g, () => arr2Instances[index2++] || "");
    output = output.replace(/\{3\}/g, () => arr3Instances[index3++] || "");

    setOutput(output);
  };

  const handleFileInput = (e, setInput, ref) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInput(event.target.result);
      };
      reader.readAsText(file);
    }
    ref.current.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-2xl text-gray-700 dark:text-gray-300">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Customizable Random Output Generator
        </h1>

        <label
          htmlFor="input1"
          className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
        >
          Input 1 (comma-separated):
        </label>
        <textarea
          id="input1"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 leading-tight focus:outline-none focus:shadow-outline mb-2 bg-white dark:bg-gray-700"
          value={input1}
          onChange={(e) => setInput1(e.target.value)}
          rows={3}
        />
        <input
          type="file"
          ref={fileInputRef1}
          className="mb-2"
          onChange={(e) => handleFileInput(e, setInput1, fileInputRef1)}
        />

        <label
          htmlFor="input2"
          className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
        >
          Input 2 (comma-separated):
        </label>
        <textarea
          id="input2"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 leading-tight focus:outline-none focus:shadow-outline mb-2 bg-white dark:bg-gray-700"
          value={input2}
          onChange={(e) => setInput2(e.target.value)}
          rows={3}
        />
        <input
          type="file"
          ref={fileInputRef2}
          className="mb-2"
          onChange={(e) => handleFileInput(e, setInput2, fileInputRef2)}
        />

        <label
          htmlFor="input3"
          className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
        >
          Input 3 (Optional, comma-separated):
        </label>
        <textarea
          id="input3"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 leading-tight focus:outline-none focus:shadow-outline mb-2 bg-white dark:bg-gray-700"
          value={input3}
          onChange={(e) => setInput3(e.target.value)}
          rows={3}
        />
        <input
          type="file"
          ref={fileInputRef3}
          className="mb-2"
          onChange={(e) => handleFileInput(e, setInput3, fileInputRef3)}
        />

        <label
          htmlFor="format"
          className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
        >
          Output Format (e.g., {1} in {2} {1} {3} {2}):
        </label>
        <input
          type="text"
          id="format"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 leading-tight focus:outline-none focus:shadow-outline mb-4 bg-white dark:bg-gray-700"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        />

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded dark:bg-blue-700 dark:hover:bg-blue-800"
          onClick={generateOutput}
        >
          Generate
        </button>

        {output && (
          <div className="mt-6 text-lg">
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              Generated Output:
            </p>
            <p className="text-gray-700 dark:text-gray-300">{output}</p>
          </div>
        )}
      </div>
    </div>
  );
}
