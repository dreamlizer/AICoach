import React from "react";

type WelcomeHeaderProps = {
  titleLines: [string, string];
};

export function WelcomeHeader({ titleLines }: WelcomeHeaderProps) {
  const renderLine = (line: string) => {
    const parts = line.split(/[,，]/);
    if (parts.length === 1) {
      return <span className="block md:inline-block">{line}</span>;
    }
    const delimiters = line.match(/[,，]/g) || [];
    return parts.map((part, index) => {
      const delimiter = delimiters[index] || "";
      if (part === "" && !delimiter) {
        return null;
      }
      return (
        <span key={`${part}-${index}`} className="block md:inline-block">
          {part}
          {delimiter}
        </span>
      );
    });
  };

  return (
    <header className="pt-0 md:pt-6 pb-2 text-center shrink-0 bg-white dark:bg-transparent w-full z-10 transition-all duration-300">
      <div className="hidden md:block text-xs font-sans font-bold tracking-[0.2em] text-[#060E9F]/60 dark:text-blue-400/80 uppercase">
        EXECUTIVE INSIDER
      </div>
      <div className="mt-2 flex w-full flex-col items-center">
        <h1 className="max-w-4xl px-6 text-center text-2xl md:text-3xl font-sans font-light dark:font-thin tracking-[0.15em] leading-relaxed text-[#202124] dark:text-[#9AA0A6] whitespace-nowrap transition-colors">
          {renderLine(titleLines[0])}
          {renderLine(titleLines[1])}
        </h1>
        <div className="mt-2.5 h-[2px] w-20 bg-[#FFBF3F] dark:bg-yellow-500/80"></div>
      </div>
    </header>
  );
}
