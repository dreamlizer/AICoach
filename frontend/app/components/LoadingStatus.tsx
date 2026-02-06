import { useEffect, useState } from "react";

interface LoadingStatusProps {
  status?: "analyzing" | "thinking" | "replying";
}

const statusTextMap = {
  analyzing: "分析中",
  thinking: "思考中",
  replying: "回复中"
};

export function LoadingStatus({ status = "analyzing" }: LoadingStatusProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 5) return ".";
        return prev + ".";
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#F8F9FA] px-5 py-3 shadow-sm border border-white/50 w-fit">
      <div className="relative h-5 w-5 flex items-center justify-center">
        {/* Breathing Core */}
        <div className="h-2 w-2 rounded-full bg-[#060E9F] animate-[pulse_2s_ease-in-out_infinite]" />
        {/* Rotating Ring */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
          <div className="h-1.5 w-1.5 rounded-full bg-[#FFBF3F] absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[1px]" />
        </div>
        {/* Subtle Track */}
        <div className="absolute inset-0 rounded-full border border-[#060E9F]/10" />
      </div>
      
      <div className="flex items-center text-sm font-medium text-[#060E9F]">
        <span>{statusTextMap[status]}</span>
        <span className="ml-0.5 inline-block w-8 text-left font-bold tracking-widest">
          {dots}
        </span>
      </div>
    </div>
  );
}
