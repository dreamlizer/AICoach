import React from "react";

export function WelcomeHeader() {
  return (
    <header className="pt-[15vh] text-center shrink-0">
      <div className="text-xs font-sans font-bold tracking-[0.2em] text-[#060E9F]/60 uppercase">
        EXECUTIVE PARTNER
      </div>
      <div className="mt-8 flex w-full flex-col items-center">
        <h1 className="max-w-4xl px-6 text-center text-3xl font-serif leading-relaxed text-[#060E9F] md:whitespace-nowrap">
          <span className="inline-block">真正的清晰来自于减法，</span>
          <span className="inline-block">而不是堆叠</span>
        </h1>
        <div className="mt-5 h-[2px] w-10 bg-[#FFBF3F]"></div>
      </div>
    </header>
  );
}
