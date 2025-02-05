"use client";
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { useSession } from "next-auth/react";

const WordDataComponent = () => {
  const [word, setWord] = useState(""); // Word input
  const [wordDataList, setWordDataList] = useState([]); // Array to store list of wordDataObject
  const [imageData, setImageData] = useState(null); // To store image data (base64)
  const { data: session } = useSession();
  // Handle word input
  const handleWordChange = (e) => {
    setWord(e.target.value);
  };

  // Handle image upload and compression
  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    const compressedImage = await compressImage(file);
    const base64Image = await convertToBase64(compressedImage);
    setImageData(base64Image); // Store the base64 string for the image
  };

  // Image compression using browser-image-compression
  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 0.5, // Set maximum size of image in MB
      maxWidthOrHeight: 300, // Set maximum width or height of image
      useWebWorker: true,
    };
    return await imageCompression(file, options); // Return the compressed image
  };

  // Convert image to base64 format
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Add word and image to the list of wordDataObjects
  const handleAddWordData = () => {
    const wordDataObject = {
      word: word,
      wordData: imageData ? imageData : word, // If image exists, store base64, else store word
    };

    setWordDataList((prevList) => [...prevList, wordDataObject]); // Add new wordDataObject to the list
    setWord(""); // Clear the word input field
    setImageData(null); // Clear the image
  };

  // Submit the list of wordDataObjects to the backend
  const handleSubmit = async () => {
    try {
      const listData = {
        title: "Default List",
        description: "This is Default Description for Default List",
        words: wordDataList,
        createdBy: session?.user?.email ? session.user.email : 'gauravsingh9314@gmail.com', // Using user ID from session
      };

      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(listData), // Send the list of wordDataObjects
      });

      const result = await response.json();
      if (response.ok) {
        console.log("Data submitted successfully:", result);
        // Reset the list after successful submission
        setWordDataList([]);
      } else {
        console.error("Failed to submit data:", result);
      }
    } catch (error) {
      console.error("Error submitting data:", error);
    }
  };

  // Handle image drop
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: "image/*",
    multiple: false, // Only allow one image at a time
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Word Data Entry
        </h2>

        {/* Word Input */}
        <input
          type="text"
          value={word}
          onChange={handleWordChange}
          placeholder="Enter word or phrase"
          className="w-full p-3 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-300"
        />

        {/* Image Upload */}
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 mb-4 rounded-lg cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:hover:border-blue-300"
        >
          <input {...getInputProps()} />
          <p className="text-gray-600 dark:text-gray-300">
            Drag & drop an image, or click to select one
          </p>
        </div>

        {imageData && (
          <div className="mb-4">
            <img
              src={imageData}
              alt="Uploaded Image"
              width="200"
              className="rounded-lg"
            />
          </div>
        )}

        {/* Add word data */}
        <button
          onClick={handleAddWordData}
          className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-500"
        >
          Add Word Data
        </button>

        {/* Word Data List */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6">
          Word Data List
        </h3>
        <ul className="mt-4 space-y-4">
          {wordDataList.map((item, index) => (
            <li
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md"
            >
              <div className="flex flex-col">
                <strong className="text-gray-800 dark:text-white">Word:</strong>
                <span className="text-gray-700 dark:text-gray-300">
                  {item.word}
                </span>
                <strong className="mt-2 text-gray-800 dark:text-white">
                  Data:
                </strong>
                <div className="flex items-center">
                  {item.wordData ? (
                    <img
                      src={item.wordData}
                      alt="Word Data"
                      width="50"
                      className="rounded-full"
                    />
                  ) : (
                    <span>{item.wordData}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Submit the list of wordDataObjects */}
        <button
          onClick={handleSubmit}
          className="w-full mt-6 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-600 dark:focus:ring-green-500"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default WordDataComponent;
