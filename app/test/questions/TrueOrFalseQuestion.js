"use client";
import { Button } from "@components/ui/button";
import React, { useEffect, useState } from "react";

const TrueOrFalseQuestion = ({ questionData }) => {
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

    const correctAnswer = questionData.answer === "True"; // Correct answer based on the question data
    const isCorrect =
      (answer === "True" && correctAnswer) ||
      (answer === "False" && !correctAnswer);

    // Return the result based on the answer
    const result = {
      correct: isCorrect,
      coins: isCorrect ? questionData.coins : 0,
    };

    setAnswered(true); // Mark the question as answered
    setAnswerResult(result); // Set the result of the answer
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg h-2/3">
      {/* <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        True or False Question
      </h3> */}
      <div className="mb-4 h-1/3">
        <p
          className="text-lg text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: questionData.title }}
        ></p>
      </div>

      {/* Options */}
      <div className="space-x-5 flex flex-row">
        <Button
          className="w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-600 dark:focus:ring-green-500"
          onClick={() => handleAnswer("True")}
          disabled={answered}
        >
          True
        </Button>
        <Button
          className="w-full p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-red-700 dark:hover:bg-red-600 dark:focus:ring-red-500"
          onClick={() => handleAnswer("False")}
          disabled={answered}
        >
          False
        </Button>
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
    </div>
  );
};

export default TrueOrFalseQuestion;
