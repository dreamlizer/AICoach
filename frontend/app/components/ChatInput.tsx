import React, { useEffect, useRef, useState } from "react";
import { ModelProvider } from "@/lib/stage_settings";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFilesSelected?: (files: FileList | null) => void;
  isLoading?: boolean;
  canSubmit?: boolean;
  selectedModel: ModelProvider;
  onModelChange: (model: ModelProvider) => void;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onFilesSelected,
  isLoading,
  canSubmit,
  selectedModel,
  onModelChange
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const canSend = canSubmit ?? Boolean(input.trim());

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight || "0");
    const paddingTop = parseFloat(style.paddingTop || "0");
    const paddingBottom = parseFloat(style.paddingBottom || "0");
    const maxHeight = lineHeight * 3 + paddingTop + paddingBottom;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  useEffect(() => {
    if (!uploadMenuOpen && !modelMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (uploadMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUploadMenuOpen(false);
      }
      if (modelMenuOpen && modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUploadMenuOpen(false);
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [uploadMenuOpen, modelMenuOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected?.(event.target.files);
    event.target.value = "";
    setUploadMenuOpen(false);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-2xl px-4 py-4 md:py-6"
    >
      <div className="relative flex items-end">
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={docInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => setUploadMenuOpen((prev) => !prev)}
          className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-[#060E9F]/40 hover:text-[#060E9F] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        {uploadMenuOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-14 left-3 z-10 w-28 rounded-xl border border-gray-100 bg-white py-2 text-sm text-[#060E9F] shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                setUploadMenuOpen(false);
                imageInputRef.current?.click();
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
            >
              图片
              <span className="text-xs text-gray-400">PNG/JPG</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMenuOpen(false);
                docInputRef.current?.click();
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
            >
              文档
              <span className="text-xs text-gray-400">PDF/Word</span>
            </button>
          </div>
        )}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入你的问题..."
          disabled={isLoading}
          rows={1}
          ref={textareaRef}
          className="w-full resize-none rounded-2xl border border-gray-200 pl-14 pr-36 py-4 text-lg leading-relaxed text-[#060E9F] placeholder:text-[#060E9F]/40 shadow-sm focus:outline-none focus:border-[#060E9F] focus:shadow-[0_0_15px_rgba(255,191,63,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          {/* Model Selection Button */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModelMenuOpen(!modelMenuOpen);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-medium text-[#060E9F] transition-colors"
              title="选择模型"
            >
              <span>{selectedModel === "deepseek" ? "DeepSeek" : "Doubao"}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${modelMenuOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {modelMenuOpen && (
              <div
                ref={modelMenuRef}
                className="absolute bottom-full right-0 mb-2 z-10 w-32 rounded-xl border border-gray-100 bg-white py-2 text-sm text-[#060E9F] shadow-lg"
              >
                 <button
                  type="button"
                  onClick={() => {
                    onModelChange("deepseek");
                    setModelMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 ${selectedModel === "deepseek" ? "bg-gray-50 font-semibold" : ""}`}
                >
                  DeepSeek
                  {selectedModel === "deepseek" && <span className="text-[#060E9F]">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onModelChange("doubao");
                    setModelMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 ${selectedModel === "doubao" ? "bg-gray-50 font-semibold" : ""}`}
                >
                  Doubao
                  {selectedModel === "doubao" && <span className="text-[#060E9F]">✓</span>}
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSend || isLoading}
            className="p-2 text-[#060E9F]/40 hover:text-[#060E9F] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
