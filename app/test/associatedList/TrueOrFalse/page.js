'use client'
import React, { useState } from "react";
import QuestionPopup from "./QuestionPopup"; // Import the QuestionPopup component

const MainComponent = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  const questionData = [
    {
      question: "Is 'Apple' associated with 'Fruit'?",
      options: ["True", "False"],
      correctAnswer: "True",
    },
    {
      question: "Is 'Dog' associated with 'Animal'?",
      options: ["True", "False"],
      correctAnswer: "True",
    },
    {
      question: "Is 'Table' associated with 'Vehicle'?",
      options: ["True", "False"],
      correctAnswer: "False",
    },
    // More questions...
  ];

  const randomizeQuestion = () => {
    const randomIndex = Math.floor(Math.random() * questionData.length);
    setCurrentQuestion(questionData[randomIndex]);
    setIsPopupOpen(true); // Open the popup
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  return (<></>
    // <div className="min-h-screen flex items-center justify-center bg-gray-100">
    //   <div className="text-center p-6">
    //     <h2 className="text-2xl font-semibold mb-6">Welcome to the Quiz</h2>
    //     <button
    //       className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg"
    //       onClick={randomizeQuestion}
    //     >
    //       Question Me
    //     </button>
    //   </div>

    //   {isPopupOpen && (
    //     <QuestionPopup questionData={currentQuestion} closePopup={closePopup} />
    //   )}
    // </div>
  );
};

export default MainComponent;
