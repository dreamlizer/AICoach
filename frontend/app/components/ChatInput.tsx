import React from "react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}

export function ChatInput({ input, setInput, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-2xl px-4 py-6"
    >
      <div className="relative flex items-center">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入你的问题..."
          disabled={isLoading}
          className="w-full rounded-full border border-gray-200 pl-6 pr-14 py-4 text-lg text-[#060E9F] placeholder:text-[#060E9F]/40 shadow-sm focus:outline-none focus:border-[#060E9F] focus:shadow-[0_0_15px_rgba(255,191,63,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-3 p-2 text-[#060E9F]/40 hover:text-[#060E9F] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </form>
  );
}
