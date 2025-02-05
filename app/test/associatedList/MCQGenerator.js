"use client";
import React, { useState, useEffect } from "react";

// Function to shuffle an array (used for MCQ answer randomization)
const shuffleArray = (array) => {
  let shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

const MCQGenerator = ({ selectedList }) => {
  const [question, setQuestion] = useState(null); // To store the generated question
  const [options, setOptions] = useState([]); // To store the options for the MCQ
  const [correctAnswer, setCorrectAnswer] = useState(""); // To store the correct answer
  const [loading, setLoading] = useState(false); // To handle loading state

  // Function to generate random MCQ
  const generateMCQ = () => {
    if (!selectedList || selectedList.length === 0) {
      return;
    }

    setLoading(true); // Start loading state

    // Select a random wordDataObject from the list
    const randomIndex = Math.floor(Math.random() * selectedList.length);
    const randomWordData = selectedList[randomIndex];

    // Create the question (using the word as the question)
    const questionText = `What is the associated data for "${randomWordData.word}"?`;
    setQuestion(questionText);

    // Prepare the correct answer and wrong options
    const correctAnswerOption = randomWordData.wordData;
    const allAnswers = [correctAnswerOption];

    // Add random wrong answers (if possible)
    while (allAnswers.length < 4) {
      const randomWrongAnswer =
        selectedList[Math.floor(Math.random() * selectedList.length)].wordData;
      if (!allAnswers.includes(randomWrongAnswer)) {
        allAnswers.push(randomWrongAnswer);
      }
    }

    // Shuffle the answers
    const shuffledAnswers = shuffleArray(allAnswers);
    setOptions(shuffledAnswers);
    setCorrectAnswer(correctAnswerOption);

    setLoading(false); // End loading state
  };

  // Only generate MCQ when the selectedList changes
  useEffect(() => {
    if (selectedList && selectedList.length > 0) {
      generateMCQ();
    }
  }, [selectedList]); // This ensures the effect runs when selectedList changes

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Generate MCQ
      </h3>
      {loading ? (
        <div className="text-center text-gray-600 dark:text-gray-300">
          Loading...
        </div>
      ) : (
        <>
          {question && (
            <>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                {question}
              </p>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <button
                    key={index}
                    className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-500"
                    onClick={() => {
                      if (option === correctAnswer) {
                        alert("Correct Answer!");
                      } else {
                        alert("Wrong Answer. Try again.");
                      }
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                className="w-full mt-6 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-600 dark:focus:ring-green-500"
                onClick={generateMCQ} // Regenerate a new question
              >
                Generate New Question
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MCQGenerator;
