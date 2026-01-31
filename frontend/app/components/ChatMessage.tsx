import { Message } from "@/lib/types";
import { AnalysisPanel } from "./AnalysisPanel";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`flex ${
        message.kind === "card" || message.kind === "analysis"
          ? "justify-center"
          : message.role === "user"
          ? "justify-end"
          : "justify-start"
      }`}
    >
      {message.kind === "card" ? (
        <div className="w-full max-w-md rounded-3xl bg-[#060E9F] px-6 py-8 text-center text-3xl font-serif text-[#FFBF3F] shadow-sm">
          {message.content}
        </div>
      ) : message.kind === "analysis" && message.debugInfo ? (
        <AnalysisPanel debugInfo={message.debugInfo} />
      ) : message.kind === "thinking" ? (
        <div className="max-w-[80%] rounded-2xl bg-[#FFF9E6] px-5 py-3 text-base text-[#002345] shadow-sm">
          <span className="inline-flex items-center gap-1 text-lg">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse">.</span>
            <span className="animate-pulse">.</span>
          </span>
        </div>
      ) : (
        <div
          className={`max-w-[80%] rounded-2xl px-5 py-3 text-base leading-relaxed shadow-sm ${
            message.role === "user"
              ? "bg-[#060E9F] text-white"
              : "bg-[#FFF9E6] text-[#002345]"
          }`}
        >
          {message.content}
        </div>
      )}
    </div>
  );
}
