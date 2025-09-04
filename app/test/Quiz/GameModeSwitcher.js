"use client";
import React from "react";

const GameModeSwitcher = ({ gameMode, setGameMode }) => {
  return (
    <div className="mb-4 flex justify-center">
      <button
        onClick={() => setGameMode("MCQ")}
        className={`px-4 py-2 rounded mr-2 ${
          gameMode === "MCQ"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        MCQ
      </button>
      <button
        onClick={() => setGameMode("TrueFalse")}
        className={`px-4 py-2 rounded ${
          gameMode === "TrueFalse"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        True/False
      </button>
    </div>
  );
};

export default GameModeSwitcher;
