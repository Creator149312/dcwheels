import React from 'react';

export default function SpinCard({ spin }) {
  return (
    <div className="bg-white dark:bg-gray-800 mb-4 p-4 rounded shadow dark:shadow-md">
      <div className="flex items-center mb-2">
        <img src={spin.avatar} alt="" className="w-8 h-8 rounded-full mr-2" />
        <span className="font-semibold text-black dark:text-white">{spin.user}</span>
        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">{spin.timestamp}</span>
      </div>
      <h3 className="mb-2 text-lg text-black dark:text-white">{spin.question}</h3>
      <div className="space-x-2">
        {spin.options.map((opt) => (
          <button
            key={opt}
            className="py-1 px-3 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded"
          >
            {opt} ({spin.votes[opt]})
          </button>
        ))}
      </div>
    </div>
  );
}
