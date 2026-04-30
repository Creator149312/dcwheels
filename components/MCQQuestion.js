"use client";
import { Button } from "@components/ui/button";
import React, { useEffect, useState } from "react";
import { isImageElement } from "@utils/HelperFunctions";

const MCQQuestion = ({ questionData }) => {
  const [answered, setAnswered] = useState(false); // To track if the question is answered
  const [answerResult, setAnswerResult] = useState(null); // To store the answer result (correct/incorrect)

  // Reset the state when the questionData changes
  useEffect(() => {
    setAnswered(false);
    setAnswerResult(null);
  }, [questionData]);

  // Function to handle answer click
  const handleAnswer = (answer) => {
    if (answered) return; // Prevent answering again if already answered

    let isCorrect = false;
    const { isValid, src } = isImageElement(answer);

    if (isValid) {
      isCorrect = src === questionData.answer;
    } else {
      isCorrect = answer === questionData.answer; // Check if the selected answer is correct
    }
    // Return the result based on the answer
    const result = {
      correct: isCorrect,
      coins: isCorrect ? questionData.coins : 0,
    };

    setAnswered(true); // Mark the question as answered
    setAnswerResult(result); // Set the result of the answer
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 h-2/3">
      {/* Question Title */}
      <div className="mb-4 h-1/3">
        <p
          className="text-lg text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: questionData.title }}
        ></p>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {questionData.options.map((option, index) => (
            <div key={index} className="flex items-center justify-center">
              <button
                className="button w-full h-full relative overflow-hidden p-4 transform transition-all duration-200 ease-out shadow-lg rounded-lg dark:bg-gray-700 dark:text-white bg-gray-50 hover:shadow-2xl hover:translate-y-[-4px] active:shadow-sm active:translate-y-1"
                onClick={() => handleAnswer(option)}
                disabled={answered}
              >
                {/* Option Content */}
                <span
                  className={`answer-choice text-center flex items-center justify-center ${
                    option.isImage ? "w-full h-full" : ""
                  }`}
                  dangerouslySetInnerHTML={{ __html: option }}
                >
                  {option.isImage && (
                    <img
                      src={option} // Assuming option is an image URL
                      alt={`Option ${index + 1}`}
                      className="object-contain w-full h-full"
                    />
                  )}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Result after answering */}
      {answered && answerResult && (
        <div className="mt-6 text-center">
          {answerResult.correct ? (
            <div className="text-green-500">
              <p className="text-xl">🎉 Correct Answer! 🎉</p>
              <p className="text-lg">You earned {answerResult.coins} coins.</p>
            </div>
          ) : (
            <div className="text-red-500">
              <p className="text-xl">😢 Incorrect Answer 😢</p>
              <p className="text-lg">Better luck next time!</p>
            </div>
          )}
        </div>
      )}

      {/* Coin display */}
      {answered && answerResult && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white py-1 px-3 rounded-lg dark:bg-yellow-400">
          <span className="text-lg font-bold">{answerResult.coins} coins</span>
        </div>
      )}
    </div>
  );
};

export default MCQQuestion;
