import { useEffect, useState } from "react";

export function LoadingStatus() {
  const [text, setText] = useState("分析中");
  const [dots, setDots] = useState(".");

  useEffect(() => {
    // Text progression: Analyzing -> Thinking -> Replying
    const timer1 = setTimeout(() => setText("思考中"), 2000);
    const timer2 = setTimeout(() => setText("回复中"), 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    // Dot animation: . -> .. -> ... -> .... -> .....
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 5) return ".";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-[80%] rounded-2xl bg-[#FFF9E6] px-5 py-3 text-base text-[#002345] shadow-sm">
      <span className="font-medium">{text}</span>
      <span className="ml-1 inline-block w-8 text-left font-bold tracking-widest">
        {dots}
      </span>
    </div>
  );
}
