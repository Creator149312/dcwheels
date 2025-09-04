"use client";
import React, { useState, useEffect } from "react";
import MCQGenerator from "./MCQGenerator";
import TrueOrFalseGenerator from "./TrueOrFalseGenerator";
import TrueOrFalseGeneratorAdv from "./TrueOrFalseGeneratorAdv";

const storedLists = [
    // Example lists, replace with real data from MongoDB
    [
      { word: "Apple", wordData: "A fruit" },
      { word: "Banana", wordData: "A fruit" },
      { word: "Carrot", wordData: "A vegetable" },
    ],
    [
      { word: "Cat", wordData: "A pet" },
      { word: "Dog", wordData: "A pet" },
      { word: "Lion", wordData: "A wild animal" },
    ],
  ];

const ListPicker = () => {
  const [lists, setLists] = useState([]); // To store the available lists
  const [selectedList, setSelectedList] = useState(storedLists[0]); // To store the selected list

//   useEffect(() => {
//     // Simulate fetching stored lists (You can fetch this from MongoDB or an API)
//     const fetchLists = async () => {
  

//       setLists(storedLists); // Assume this is fetched from the database
//     };

//     fetchLists();
//   }, []);

  const handleSelectList = (index) => {
    setSelectedList(lists[index]); // Set the selected list
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Pick a List to Generate MCQs
      </h2>
      <div className="space-y-4">
        {lists.map((list, index) => (
          <button
            key={index}
            onClick={() => handleSelectList(index)}
            className="w-full p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-500"
          >
            List {index + 1}
          </button>
        ))}
      </div>
      {selectedList && <TrueOrFalseGeneratorAdv selectedList={selectedList} />}
    </div>
  );
};

export default ListPicker;
