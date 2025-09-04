'use client'
import React, { useState } from "react";

const QuestionPopup = ({ questionData, closePopup }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    setIsAnswered(true);
    if (answer === questionData.correctAnswer) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
        <h3 className="text-xl font-semibold mb-4">{questionData.question}</h3>
        <div className="space-y-3">
          {questionData.options.map((option, index) => (
            <button
              key={index}
              className={`w-full p-3 rounded-lg ${selectedAnswer === option ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={() => handleAnswer(option)}
              disabled={isAnswered}
            >
              {option}
            </button>
          ))}
        </div>

        {isAnswered && (
          <div className="mt-4 text-center">
            {isCorrect ? (
              <div className="text-green-500">🎉 Correct! 🎉</div>
            ) : (
              <div className="text-red-500">😞 Wrong Answer. Try again! 😞</div>
            )}
            <button
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg"
              onClick={closePopup}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPopup;
