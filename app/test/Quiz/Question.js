"use client";
import React from "react";

const Question = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  gameMode,
  correctAnswer,
}) => {
  const getOptions = () => {
    if (gameMode === "MCQ") {
      return question?.options || [];
    } else if (gameMode === "TrueFalse") {
      return ["True", "False"];
    }
    return [];
  };

  return (
    <div>
      <p className="text-lg mb-4">{question?.title || "Loading..."}</p>
      {question && getOptions().length > 0 ? (
        getOptions().map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswerSelect(option)}
            className={`button min-w-full rounded-[16px] border-2 border-[#e5e5e5] border-b-6 
                       hover:bg-[#ddf4ff] hover:border-[#1cb0f6] active:border-b-2 active:border-[#1cb0f6]
                       m-2 transition-all inline-flex p-3 md:p-4
                       ${
                         selectedAnswer === option && correctAnswer === option
                           ? "bg-green-200 border-green-500 shadow-md shadow-green-200"
                           : ""
                       }
                       ${
                         selectedAnswer === option && correctAnswer !== option
                           ? "bg-red-200 border-red-500 shadow-md shadow-red-200"
                           : ""
                       }
                       ${
                         correctAnswer === option && selectedAnswer !== option
                           ? "border-2 border-green-500"
                           : ""
                       }
                       `}
          >
            <div className="answer-number border-2 border-[#e5e5e5] rounded-[8px] w-8 h-8 flex justify-center items-center mr-2">
              {gameMode === "TrueFalse"
                ? option === "True"
                  ? "T"
                  : "F"
                : index + 1}
            </div>
            <div className="answer-choice w-full text-left font-medium text-base md:text-lg text-[#4b4b4b]">
              {option}
            </div>
          </button>
        ))
      ) : (
        <div>Loading options...</div>
      )}
    </div>
  );
};

export default Question;
