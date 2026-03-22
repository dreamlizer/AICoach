import React from "react";

interface RecommendedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function RecommendedQuestions({ questions, onSelect }: RecommendedQuestionsProps) {
  return (
    <div className="flex flex-col gap-1 w-full max-w-2xl px-4 transition-opacity duration-500">
      {questions.map((question, index) => (
        <button
          key={index}
          onClick={() => onSelect(question)}
          className="text-left py-1 px-4 rounded-xl bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333333] hover:border-[#060E9F]/20 hover:bg-[#F8F9FA] dark:hover:bg-[#2C2C2C] hover:shadow-sm text-gray-500 dark:text-gray-300 hover:text-[#060E9F] dark:hover:text-blue-400 transition-all duration-200 group flex items-start"
        >
          <span className="mr-3 mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-[#060E9F] dark:group-hover:bg-blue-400 shrink-0 transition-colors"></span>
          <span className="text-[0.8125rem] font-normal leading-relaxed">
            <span className="md:hidden">
              {question.length > 15 ? question.slice(0, 15) + "..." : question}
            </span>
            <span className="hidden md:inline">
              {question.length > 20 ? question.slice(0, 20) + "...." : question}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
