/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { Message } from "@/lib/types";
import { AnalysisPanel } from "./AnalysisPanel";
import { LoadingStatus } from "./LoadingStatus";

interface ChatMessageProps {
  message: Message;
  isSuperAdmin?: boolean;
  showDebugInfo?: boolean;
}

export function ChatMessage({ message, isSuperAdmin = false, showDebugInfo = true }: ChatMessageProps) {
  const [canvasView, setCanvasView] = useState<"preview" | "code">("preview");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [iframeHeight, setIframeHeight] = useState(360);
  const [isCopied, setIsCopied] = useState(false);

  const { mainContent, attachments } = useMemo(() => {
    if (message.role !== "user" || !message.content.includes("[附件]")) {
      return { mainContent: message.content, attachments: [] };
    }

    const parts = message.content.split("\n\n[附件]\n");
    if (parts.length < 2) return { mainContent: message.content, attachments: [] };

    const mainContent = parts[0];
    const attachmentBlock = parts[1];
    const attachments = attachmentBlock
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => {
        const raw = line.substring(2);
        // Match: filename (type) [url:...] or filename (type)
        const match = raw.match(/^(.*?) \((.*?)\)(?: \[url:(.*?)\])?$/);
        if (match) {
          return { name: match[1], type: match[2], url: match[3] };
        }
        return { name: raw, type: "document" };
      });

    return { mainContent, attachments };
  }, [message.content, message.role]);

  const copyToClipboard = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
      className={`group flex ${
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
        // Only show analysis panel if user is super admin
        isSuperAdmin ? (
          <div 
            className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${
              showDebugInfo ? "max-h-[1000px] opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
            }`}
          >
             <AnalysisPanel debugInfo={message.debugInfo} />
          </div>
        ) : null
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
        <LoadingStatus status={message.status} />
      ) : (
        <div className={`flex items-end gap-2 max-w-[60%] ${message.role === "user" ? "flex-row" : "flex-col"}`}>
          {message.role === "user" && (
            <button
              onClick={copyToClipboard}
              className="mb-2 p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
              title="复制"
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
          
          <div className="flex w-full flex-col items-end">
            {/* Attachments Display - Outside Bubble */}
            {attachments.length > 0 && (
              <div className="mb-1 flex flex-wrap justify-end gap-2">
                {attachments.map((file, i) => {
                  const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(file.type.toLowerCase());
                  return (
                    <div 
                      key={i} 
                      className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white ${
                        isImage ? "h-20 w-20" : "h-10 px-3"
                      }`}
                      title={file.name}
                    >
                      {isImage && file.url ? (
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-110 cursor-pointer" 
                          onClick={() => window.open(file.url, '_blank')}
                        />
                      ) : isImage ? (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 text-xs text-gray-400">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1 opacity-50">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                          <span className="max-w-[50px] truncate text-[9px]">IMG</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                           <div className="flex h-6 w-8 items-center justify-center rounded bg-blue-50 text-blue-600">
                             <span className="text-[9px] font-bold uppercase">{file.name.split('.').pop()?.slice(0,4) || "DOC"}</span>
                           </div>
                           <span className="max-w-[120px] truncate">{file.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex w-full flex-row items-end gap-2">
              <div
                className={`flex-1 rounded-2xl px-5 py-3 text-base leading-relaxed prose max-w-none break-words ${
                  message.role === "user"
                    ? "bg-[#060E9F] text-white shadow-sm prose-invert prose-p:text-white prose-headings:text-white"
                    : "bg-transparent text-[#002345] shadow-none animate-materialize prose-headings:text-[#002345] prose-p:text-[#002345] prose-strong:text-[#002345]"
                }`}
              >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500" />
                    ),
                    p: ({ node, ...props }) => (
                      <p {...props} className="mb-2 last:mb-0" />
                    ),
                  }}
                >
                  {mainContent}
                </ReactMarkdown>
                {message.role === "ai" && (
                  <div className="mt-4 h-[2px] w-20 bg-[#FFBF3F]"></div>
                )}
              </div>
              {message.role === "ai" && (
                <button
                  onClick={copyToClipboard}
                  className="mb-3 flex items-center justify-center text-gray-400 hover:text-[#060E9F] transition-colors"
                  title="复制回答"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
