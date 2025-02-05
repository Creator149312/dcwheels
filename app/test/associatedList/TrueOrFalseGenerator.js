import React, { useState, useEffect } from 'react';

// Function to shuffle an array (used for randomization)
const shuffleArray = (array) => {
  let shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

const TrueOrFalseGenerator = ({ selectedList }) => {
  const [question, setQuestion] = useState(null); // To store the generated question
  const [correctAnswer, setCorrectAnswer] = useState(""); // To store the correct answer
  const [loading, setLoading] = useState(false); // To handle loading state

  // Function to generate a True or False question
  const generateTrueOrFalseQuestion = () => {
    if (!selectedList || selectedList.length === 0) {
      return;
    }

    setLoading(true); // Start loading state

    // Select a random wordDataObject from the list
    const randomIndex = Math.floor(Math.random() * selectedList.length);
    const randomWordData = selectedList[randomIndex];

    // Generate the question (using the word as the question)
    const questionText = `Is "${randomWordData.word}" associated with "${randomWordData.wordData}"?`;
    setQuestion(questionText);

    // Set the correct answer (assuming the data is always correct)
    setCorrectAnswer(true); // We're assuming the data is correct in this case.

    setLoading(false); // End loading state
  };

  // Only generate a question when the selectedList changes
  useEffect(() => {
    if (selectedList && selectedList.length > 0) {
      generateTrueOrFalseQuestion();
    }
  }, [selectedList]); // This ensures the effect runs when selectedList changes

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">True or False Generator</h3>
      {loading ? (
        <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
      ) : (
        <>
          {question && (
            <>
              <p className="mb-4 text-gray-700 dark:text-gray-300">{question}</p>
              <div className="space-y-3">
                <button
                  className="w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-600 dark:focus:ring-green-500"
                  onClick={() => {
                    if (correctAnswer) {
                      alert("Correct Answer!");
                    } else {
                      alert("Wrong Answer. Try again.");
                    }
                  }}
                >
                  True
                </button>
                <button
                  className="w-full p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-red-700 dark:hover:bg-red-600 dark:focus:ring-red-500"
                  onClick={() => {
                    if (!correctAnswer) {
                      alert("Correct Answer!");
                    } else {
                      alert("Wrong Answer. Try again.");
                    }
                  }}
                >
                  False
                </button>
              </div>
              <button
                className="w-full mt-6 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-500"
                onClick={generateTrueOrFalseQuestion} // Regenerate a new question
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

export default TrueOrFalseGenerator;
