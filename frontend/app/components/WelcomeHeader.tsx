import React from "react";

type WelcomeHeaderProps = {
  titleLines: [string, string];
};

export function WelcomeHeader({ titleLines }: WelcomeHeaderProps) {
  return (
    <header className="pt-6 pb-2 text-center shrink-0 bg-white w-full z-10 transition-all duration-300">
      <div className="text-xs font-sans font-bold tracking-[0.2em] text-[#060E9F]/60 uppercase">
        EXECUTIVE INSIDER
      </div>
      <div className="mt-2 flex w-full flex-col items-center">
        <h1 className="max-w-4xl px-6 text-center text-2xl md:text-3xl font-sans font-light tracking-[0.15em] leading-relaxed text-[#202124] md:whitespace-nowrap">
          <span className="inline-block">{titleLines[0]}</span>
          <span className="inline-block">{titleLines[1]}</span>
        </h1>
        <div className="mt-2.5 h-[2px] w-20 bg-[#FFBF3F]"></div>
      </div>
    </header>
  );
}
