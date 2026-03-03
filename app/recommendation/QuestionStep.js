"use client";

import { CheckCircle2 } from "lucide-react";

export default function QuestionStep({ question, options, onAnswer }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Question Header */}
      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
          {question}
        </h2>
        <div className="h-1 w-12 bg-blue-600 rounded-full" />
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onAnswer(opt)}
            className="group relative w-full flex items-center justify-between p-4 md:p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-left transition-all duration-200 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 hover:shadow-md active:scale-[0.98]"
          >
            <span className="text-base md:text-lg font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {opt}
            </span>
            
            {/* Visual indicator on hover/tap */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CheckCircle2 className="text-blue-600" size={20} />
            </div>

            {/* Subtle background glow on hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/[0.02] pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
}