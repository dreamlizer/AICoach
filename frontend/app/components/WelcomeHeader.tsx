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
    <header className="w-full shrink-0 bg-white pt-0 pb-2 text-center transition-all duration-300 dark:bg-transparent md:pt-6">
      <div className="hidden text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#060E9F]/60 dark:text-blue-400/80 md:block">
        DREAM LAB
      </div>
      <div className="mt-2 flex w-full flex-col items-center">
        <h1 className="max-w-4xl whitespace-nowrap px-6 text-center font-sans text-2xl font-light leading-relaxed tracking-[0.15em] text-[#202124] transition-colors dark:font-thin dark:text-[#9AA0A6] md:text-3xl">
          {renderLine(titleLines[0])}
          {renderLine(titleLines[1])}
        </h1>
        <div className="mt-2.5 h-[2px] w-20 bg-[#FFBF3F] dark:bg-yellow-500/80"></div>
      </div>
    </header>
  );
}
