import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/language-context";
import { ModelMode } from "@/lib/stage_settings";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFilesSelected?: (files: FileList | null) => void;
  attachments?: { name: string; type: string }[];
  onRemoveAttachment?: (index: number) => void;
  isLoading?: boolean;
  canSubmit?: boolean;
  modelMode: ModelMode;
  onModelModeChange: (mode: ModelMode) => void;
  onStop?: () => void;
  className?: string;
  placeholder?: string;
  toolName?: string;
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
  modelMode,
  onModelModeChange,
  onStop,
  className,
  placeholder,
  toolName
}: ChatInputProps) {
  const { language, t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    setPlaceholderIndex(Math.floor(Math.random() * 3));
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const placeholders = [
    t('placeholder1'),
    t('placeholder2'),
    t('placeholder3')
  ];

  const canSend = canSubmit ?? Boolean(input.trim());

  // Auto-resize logic with safe bounds
  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to allow shrinking
    textarea.style.height = "auto";
    
    // If empty, reset inline height so rows attribute or CSS takes effect
    if (!textarea.value) {
        textarea.style.height = "";
        return;
    }

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
    if (!uploadMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (uploadMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUploadMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUploadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [uploadMenuOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected?.(event.target.files);
    event.target.value = "";
    setUploadMenuOpen(false);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`mx-auto w-full max-w-2xl px-3 md:px-4 ${className ?? "py-4 md:py-6"}`}
    >
      <div className="relative flex flex-col rounded-2xl bg-white dark:bg-[#1E1E1E] border border-transparent dark:border-[#333333] shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-dark-sidebar px-3 py-1.5 text-xs text-gray-600 dark:text-dark-text-secondary"
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
          placeholder={placeholder || placeholders[placeholderIndex]}
          disabled={isLoading}
          rows={2} // Default to 2 rows to show placeholders on mobile
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
          className="w-full resize-none bg-transparent px-4 py-3 text-base font-normal text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-extralight focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-[#444444] text-[#060E9F]/40 dark:text-gray-400 hover:text-[#060E9F] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            {uploadMenuOpen && (
              <div
                ref={menuRef}
                className="absolute bottom-full left-0 mb-2 z-10 w-28 rounded-xl border border-gray-100 dark:border-dark-border bg-white dark:bg-[#2C2C2C] py-2 text-sm text-[#060E9F] dark:text-dark-text-primary shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => {
                    setUploadMenuOpen(false);
                    imageInputRef.current?.click();
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-[#383838]"
                >
                  {t('image')}
                  <span className="text-xs text-gray-400 dark:text-dark-text-muted">PNG/JPG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMenuOpen(false);
                    docInputRef.current?.click();
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-[#383838]"
                >
                  {t('document')}
                  <span className="text-xs text-gray-400 dark:text-dark-text-muted">PDF/Word</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Side: Mode & Send Button */}
          <div className="flex items-center gap-2">
            {/* Mode Toggle Button (Fast / Pro) */}
            <div className="flex bg-gray-100 dark:bg-[#2C2C2C] rounded-full p-1 h-8 items-center">
              <button
                type="button"
                onClick={() => onModelModeChange("fast")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all h-full flex items-center whitespace-nowrap ${
                  modelMode === "fast" 
                    ? "bg-[#060E9F] text-white shadow-sm" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
                title={t('fastModeDesc')}
              >
                {t('fast')}
              </button>
              <button
                type="button"
                onClick={() => onModelModeChange("pro")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all h-full flex items-center whitespace-nowrap ${
                  modelMode === "pro" 
                    ? "bg-[#060E9F] text-white shadow-sm" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
                title={t('proModeDesc')}
              >
                {t('pro')}
              </button>
            </div>

            {/* Send / Stop Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#060E9F] dark:bg-white text-white dark:text-[#060E9F] shadow-md transition-all hover:bg-[#060E9F]/90 dark:hover:bg-gray-100 hover:shadow-lg active:scale-95"
                title="停止生成"
              >
                <div className="h-3 w-3 bg-white dark:bg-[#060E9F] rounded-sm" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                  canSend
                    ? "bg-[#060E9F] dark:bg-white text-white dark:text-[#060E9F] shadow-md hover:bg-[#060E9F]/90 dark:hover:bg-gray-200 hover:shadow-lg active:scale-95"
                    : "bg-gray-100 dark:bg-[#333333] text-gray-400 dark:text-gray-500 cursor-not-allowed"
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
      {toolName && (
        <div className="mt-2 w-full text-left text-sm font-semibold text-[#060E9F] dark:text-blue-400">
          <span>正在使用 </span>
          <span className="inline-flex flex-col items-start">
            <span>{toolName}</span>
            <span className="mt-1 h-[2px] w-full bg-[#FFBF3F]" />
          </span>
          <span> 思维工具</span>
        </div>
      )}
    </form>
  );
}
