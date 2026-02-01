import { useEffect, useRef, useState } from "react";
import { Message } from "@/lib/types";
import { AnalysisPanel } from "./AnalysisPanel";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [canvasView, setCanvasView] = useState<"preview" | "code">("preview");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [iframeHeight, setIframeHeight] = useState(360);

  const updateIframeHeight = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const height = Math.max(
        360,
        doc.documentElement?.scrollHeight || 0,
        doc.body?.scrollHeight || 0
      );
      setIframeHeight(height);
    } catch {}
  };

  const handleIframeLoad = () => {
    updateIframeHeight();
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      observerRef.current?.disconnect();
      observerRef.current = new ResizeObserver(() => updateIframeHeight());
      observerRef.current.observe(doc.documentElement);
      if (doc.body) {
        observerRef.current.observe(doc.body);
      }
    } catch {}
  };

  useEffect(() => {
    if (canvasView !== "preview") return;
    updateIframeHeight();
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [canvasView, message.canvasHtml]);

  return (
    <div
      className={`flex ${
        message.kind === "card" || message.kind === "analysis" || message.kind === "canvas"
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
      ) : message.kind === "canvas" && message.canvasHtml ? (
        <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-400">
            <span>画布预览</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCanvasView("preview")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  canvasView === "preview"
                    ? "bg-[#060E9F]/10 text-[#060E9F]"
                    : "text-gray-400 hover:text-[#060E9F]"
                }`}
              >
                预览
              </button>
              <button
                type="button"
                onClick={() => setCanvasView("code")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  canvasView === "code"
                    ? "bg-[#060E9F]/10 text-[#060E9F]"
                    : "text-gray-400 hover:text-[#060E9F]"
                }`}
              >
                代码
              </button>
            </div>
          </div>
          {canvasView === "preview" ? (
            <iframe
              title="canvas-preview"
              sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-downloads"
              srcDoc={message.canvasHtml}
              ref={iframeRef}
              onLoad={handleIframeLoad}
              style={{ height: `${iframeHeight}px` }}
              className="w-full"
            />
          ) : (
            <pre className="max-h-[360px] overflow-auto bg-[#FBFBFB] px-4 py-3 text-xs text-[#002345]">
              {message.canvasHtml}
            </pre>
          )}
        </div>
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
