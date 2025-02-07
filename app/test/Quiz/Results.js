import React from 'react';

const Results = ({ score, onRestart }) => {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Quiz Finished!</h3>
      <p className="text-lg">Your final score: {score} coins</p>
      <button
        onClick={onRestart}
        className="button min-w-full rounded-[16px] border-2 border-[#e5e5e5] border-b-6 
                   hover:bg-[#ddf4ff] hover:border-[#1cb0f6] active:border-b-2 active:border-[#1cb0f6]
                   m-2 transition-all inline-flex p-3 md:p-4 bg-blue-500 hover:bg-blue-700 text-white font-bold"
      >
        Restart Quiz
      </button>
    </div>
  );
};

export default Results;