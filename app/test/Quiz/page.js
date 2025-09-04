"use client";

import React, { useState, useEffect } from "react";
import Question from "./Question";
import Results from "./Results";
import Header from "./Header";

import GameModeSwitcher from './GameModeSwitcher';

const questionData = [
  {
    item: "apple",
    data: {
      title: "Which fruit is this?",
      type: "MCQ",
      options: ["Banana", "Apple", "Orange", "Grape"],
      answer: "Apple",
      coins: 5,
      isImage: false,
    },
  },
  {
    item: "dog",
    data: {
      title: "What animal is this?",
      type: "MCQ",
      options: ["Cat", "Dog", "Cow", "Lion"],
      answer: "Dog",
      coins: 5,
      isImage: false,
    },
  },
  {
    item: "apple_tf",
    data: {
      title: "Is this an apple?",
      isTrue: true,
      coins: 5,
    },
  },
  {
    item: "car",
    data: {
      title: "What is this?",
      type: "MCQ",
      options: ["Bicycle", "Car", "Truck", "Motorcycle"],
      answer: "Car",
      coins: 5,
      isImage: false,
    },
  },
  {
    item: "dog_tf",
    data: {
      title: "Is this a dog?",
      isTrue: true,
      coins: 5,
    },
  },
  {
    item: "banana",
    data: {
      title: "Which fruit is this?",
      type: "MCQ",
      options: ["Banana", "Apple", "Orange", "Grape"],
      answer: "Banana",
      coins: 5,
      isImage: false,
    },
  },
  {
    item: "cat",
    data: {
      title: "What animal is this?",
      type: "MCQ",
      options: ["Cat", "Dog", "Cow", "Lion"],
      answer: "Cat",
      coins: 5,
      isImage: false,
    },
  },
  {
    item: "car_tf",
    data: {
      title: "Is this a car?",
      isTrue: true,
      coins: 5,
    },
  },
];

const Quiz = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalCoins, setTotalCoins] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [gameMode, setGameMode] = useState('MCQ');

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);

  useEffect(() => {
    let timer;

    if (timerActive) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
        if (timeLeft === 0) {
          handleNextQuestion();
        }
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    if (questionData.length > 0) {
      setCurrentQuestion(questionData[currentQuestionIndex]);
      setCorrectAnswer(questionData[currentQuestionIndex]?.data?.answer || questionData[currentQuestionIndex]?.data?.isTrue?.toString());
    }
  }, [questionData, currentQuestionIndex]);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setCorrectAnswer(null);

    if (questionData.length > 0) {
      setCurrentQuestion(questionData[0]);
      setCorrectAnswer(questionData[0]?.data?.answer || questionData[0]?.data?.isTrue?.toString());
    }
  }, [gameMode]);

  const checkAnswer = (selected) => {
    if (!currentQuestion) return false;
    const isCorrect = gameMode === "MCQ"
      ? selected === currentQuestion.data.answer
      : selected === (currentQuestion.data.isTrue ? "True" : "False");
    return isCorrect;
  };

  const handleNextQuestion = () => {
    let earnedCoins = 0;
    let isCorrect = checkAnswer(selectedAnswer);

    if (isCorrect) {
      earnedCoins = currentQuestion.data.coins;
      setScore(score + earnedCoins);
      setTotalCoins(totalCoins + earnedCoins);
      setStreak(streak + 1);
      if (streak % 5 === 0) {
        setLevel(level + 1);
      }
    } else {
      setStreak(0);
      setTimeLeft(20);
    }

    setSelectedAnswer(null);
    setTimeLeft(20);
    setTimerActive(true);
    setCorrectAnswer(null);

    if (currentQuestionIndex < questionData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResult(true);
      setTimerActive(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    setTimerActive(false);
    setCorrectAnswer(currentQuestion.data.answer || (currentQuestion.data.isTrue ? "True" : "False"));
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setLevel(1);
    setTotalCoins(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(20);
    setTimerActive(true);
    setCorrectAnswer(null);
  };

  return (<></>
    // <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
    //   <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md mt-8">
    //     <Header level={level} totalCoins={totalCoins} streak={streak} />

    //     <GameModeSwitcher gameMode={gameMode} setGameMode={setGameMode} />

    //     <h2 className="text-2xl font-bold mb-4">Quiz Time!</h2>

    //     {showResult ? (
    //       <Results score={score} onRestart={handleRestartQuiz} />
    //     ) : (
    //       <div>
    //         <div className="mb-4 text-center">
    //           <span className="text-xl font-bold">Time: {timeLeft}</span>
    //         </div>
    //         {currentQuestion ? (
    //           <Question
    //             question={currentQuestion.data}
    //             selectedAnswer={selectedAnswer}
    //             onAnswerSelect={handleAnswerSelect}
    //             gameMode={gameMode}
    //             correctAnswer={correctAnswer}
    //           />
    //         ) : (
    //           <div>Loading question...</div>
    //         )}

    //         <button
    //           onClick={handleNextQuestion}
    //           disabled={selectedAnswer === null}
    //           className={`button min-w-full rounded-[16px] border-2 border-[#e5e5e5] border-b-6 
    //                      hover:bg-[#ddf4ff] hover:border-[#1cb0f6] active:border-b-2 active:border-[#1cb0f6]
    //                      m-2 transition-all inline-flex p-3 md:p-4 bg-blue-500 hover:bg-blue-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
    //         >
    //           {currentQuestionIndex === questionData.length - 1 ? 'Finish' : 'Next'}
    //         </button>
    //       </div>
    //     )}
    //   </div>
    // </div>
  );
};

export default Quiz;