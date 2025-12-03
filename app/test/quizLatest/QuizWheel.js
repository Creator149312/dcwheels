"use client";
import { Wheel } from "react-custom-roulette";
import { useState } from "react";
import MCQQuestion from "../questions/MCQQuestionSimple";

const QuizWheel = ({ segments: initialSegments }) => {
  const [segments, setSegments] = useState(initialSegments || []);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // ✅ Define coin counter state
  const [totalCoins, setTotalCoins] = useState(0);

  const handleSpinClick = () => {
    if (segments.length === 0) return;
    const newPrizeNumber = Math.floor(Math.random() * segments.length);
    setPrizeNumber(newPrizeNumber);
    setMustSpin(true);
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    setSelectedQuestion(segments[prizeNumber]);
  };

  const handleAnswered = (correct, id, coins) => {
    if (correct) {
      // remove the segment
      setSegments((prev) => prev.filter((seg) => seg.id !== id));
      // add coins to total
      setTotalCoins((prev) => prev + coins);
    }
    // close popup automatically
    setSelectedQuestion(null);
  };

  return (
    <div className="flex flex-col items-center">
      {/* ✅ Show coin counter */}
      <div className="mb-4 text-xl font-bold text-yellow-600">
        Total Coins: {totalCoins}
      </div>

      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={(segments || []).map((seg) => ({ option: seg.title }))}
        onStopSpinning={handleStopSpinning}
      />

      <button
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg"
        onClick={handleSpinClick}
        disabled={segments.length === 0}
      >
        {segments.length > 0 ? "Spin the Wheel" : "All questions answered!"}
      </button>

      {selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg relative w-[90%] max-w-lg">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedQuestion(null)}
            >
              ✖
            </button>
            <MCQQuestion
              questionData={selectedQuestion}
              onAnswered={handleAnswered}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizWheel;
