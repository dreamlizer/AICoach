import { useEffect, useState } from "react";

interface LoadingStatusProps {
  status?: "analyzing" | "thinking" | "replying" | "done";
  keywords?: string[];
}

const statusTextMap = {
  analyzing: "分析中",
  thinking: "思考中",
  replying: "回复中",
  done: "完成"
};

export function LoadingStatus({ status = "analyzing", keywords = [] }: LoadingStatusProps) {
  const [dots, setDots] = useState(".");
  const [dynamicText, setDynamicText] = useState("");
  const [keywordIndex, setKeywordIndex] = useState(0);

  // Dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 5) return ".";
        return prev + ".";
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Dynamic text rotation for "thinking" state
  useEffect(() => {
    if (status !== "thinking" || !keywords || keywords.length === 0) {
      setDynamicText(statusTextMap[status]);
      return;
    }

    // Initial text
    setDynamicText(keywords[keywordIndex] || statusTextMap[status]);

    let interval: NodeJS.Timeout;

    // First switch after 4 seconds
    const timeout = setTimeout(() => {
      setKeywordIndex((prev) => {
        const next = (prev + 1) % keywords.length;
        setDynamicText(keywords[next]);
        return next;
      });

      // Subsequent switches every 6 seconds
      interval = setInterval(() => {
        setKeywordIndex((prev) => {
          const next = (prev + 1) % keywords.length;
          setDynamicText(keywords[next]);
          return next;
        });
      }, 6000);
    }, 4000);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, keywords]); // Intentionally omitting keywordIndex to avoid reset loop

  // Fallback if not thinking or no keywords
  let displayText = (status === "thinking" && keywords.length > 0) 
    ? dynamicText 
    : statusTextMap[status];

  // Remove duplicate "正在" prefix if it exists
  if (displayText.startsWith("正在正在")) {
    displayText = displayText.replace("正在正在", "正在");
  } else if (displayText.startsWith("正在") && status === "thinking" && keywords.length > 0) {
    // If it already starts with "正在", we don't need to do anything special here
    // but we should ensure the backend isn't sending it twice.
    // As a safety measure, if we have "正在" twice in the string anywhere:
    displayText = displayText.replace(/正在正在/g, "正在");
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#F8F9FA] dark:bg-dark-sidebar px-5 py-3 shadow-sm border border-white/50 dark:border-dark-border w-fit transition-all">
      <div className="relative h-5 w-5 flex items-center justify-center">
        {/* Breathing Core */}
        <div className="h-2 w-2 rounded-full bg-[#060E9F] dark:bg-blue-400 animate-[pulse_2s_ease-in-out_infinite]" />
        {/* Rotating Ring */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
          <div className="h-1.5 w-1.5 rounded-full bg-[#FFBF3F] dark:bg-yellow-500 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[1px]" />
        </div>
        {/* Subtle Track */}
        <div className="absolute inset-0 rounded-full border border-[#060E9F]/10 dark:border-blue-400/20" />
      </div>
      
      <div className="flex items-center text-sm font-medium text-[#060E9F] dark:text-blue-400">
        <span className="animate-in fade-in slide-in-from-bottom-1 duration-500 key={displayText}">
            {displayText}
        </span>
        <span className="ml-0.5 inline-block w-8 text-left font-bold tracking-widest">
          {dots}
        </span>
      </div>
    </div>
  );
}
