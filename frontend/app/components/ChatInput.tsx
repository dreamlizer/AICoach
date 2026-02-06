import React, { useEffect, useRef, useState } from "react";
import { ModelProvider } from "@/lib/stage_settings";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFilesSelected?: (files: FileList | null) => void;
  attachments?: { name: string; type: string }[];
  onRemoveAttachment?: (index: number) => void;
  isLoading?: boolean;
  canSubmit?: boolean;
  selectedModel: ModelProvider;
  onModelChange: (model: ModelProvider) => void;
  onStop?: () => void;
  className?: string;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onFilesSelected,
  attachments = [],
  onRemoveAttachment,
  isLoading,
  canSubmit,
  selectedModel,
  onModelChange,
  onStop,
  className
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const canSend = canSubmit ?? Boolean(input.trim());

  // Auto-resize logic with safe bounds
  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight || "0");
    const paddingTop = parseFloat(style.paddingTop || "0");
    const paddingBottom = parseFloat(style.paddingBottom || "0");
    // Limit to ~6 lines
    const maxHeight = lineHeight * 6 + paddingTop + paddingBottom;
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
      className={`mx-auto w-full max-w-2xl px-4 ${className ?? "py-4 md:py-6"}`}
    >
      <div className="relative flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 focus-within:border-[#060E9F] focus-within:shadow-[0_0_15px_rgba(255,191,63,0.3)]">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600"
              >
                <span className="max-w-[150px] truncate">{file.name}</span>
                {onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(index)}
                    className="ml-1 text-gray-400 hover:text-red-500"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入你的问题..."
          disabled={isLoading}
          rows={1}
          ref={textareaRef}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
                onSubmit(fakeEvent);
              }
            }
          }}
          className="w-full resize-none bg-transparent px-4 py-3 text-base leading-relaxed text-black placeholder:text-[#060E9F]/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left Side: Attachment Button */}
          <div className="relative">
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-[#060E9F]/40 hover:text-[#060E9F] hover:bg-gray-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            {uploadMenuOpen && (
              <div
                ref={menuRef}
                className="absolute bottom-full left-0 mb-2 z-10 w-28 rounded-xl border border-gray-100 bg-white py-2 text-sm text-[#060E9F] shadow-lg"
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
          </div>

          {/* Right Side: Model Selection & Send Button */}
          <div className="flex items-center gap-2">
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

            {/* Send / Stop Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#060E9F] text-white shadow-md transition-all hover:bg-[#060E9F]/90 hover:shadow-lg active:scale-95"
                title="停止生成"
              >
                <div className="h-3 w-3 bg-white rounded-sm" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                  canSend
                    ? "bg-[#060E9F] text-white shadow-md hover:bg-[#060E9F]/90 hover:shadow-lg active:scale-95"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
