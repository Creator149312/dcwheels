// components/Question.jsx
import React from 'react';

const Question = ({ question, selectedAnswer, onAnswerSelect, gameMode }) => {
  const getOptions = () => {
    if (gameMode === 'MCQ') {
      return question.options;
    } else if (gameMode === 'TrueFalse') {
      return ['True', 'False'];
    }
    return [];
  };

  return (
    <div>
      <p className="text-lg mb-4">{question.title}</p>
      {getOptions().map((option, index) => (
        <button
          key={index}
          onClick={() => onAnswerSelect(option)}
          className={`button min-w-full rounded-[16px] border-2 border-[#e5e5e5] border-b-6 
                     hover:bg-[#ddf4ff] hover:border-[#1cb0f6] active:border-b-2 active:border-[#1cb0f6]
                     m-2 transition-all inline-flex p-3 md:p-4 ${
                       selectedAnswer === option ? 'bg-blue-200 border-blue-500' : ''
                     }`}
        >
          <div className="answer-number border-2 border-[#e5e5e5] rounded-[8px] w-8 h-8 flex justify-center items-center mr-2">
            {gameMode === 'TrueFalse' ? (option === 'True' ? 'T' : 'F') : index + 1}
          </div>
          <div className="answer-choice w-full text-left font-medium text-base md:text-lg text-[#4b4b4b]">
            {option}
          </div>
        </button>
      ))}
    </div>
  );
};

export default Question;
