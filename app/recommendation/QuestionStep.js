// components/QuestionStep.tsx
"use client";

export default function QuestionStep({ question, options, onAnswer }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{question}</h2>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onAnswer(opt)}
            className="w-full border rounded-lg py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
