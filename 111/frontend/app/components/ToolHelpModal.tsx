"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ExecutiveTool } from "@/lib/types";
import { toolIconMap } from "@/app/components/Icons";

interface ToolHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: ExecutiveTool | null | undefined;
  sectionTitles?: {
    introduction: string;
    usage: string;
    outcome: string;
  };
  onNext?: () => void;
  onPrev?: () => void;
}

// Helper for text rendering with simple bold support (**text**) and newlines
const renderText = (text: string | undefined) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-bold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
      {i < text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};

export function ToolHelpModal({ isOpen, onClose, tool, sectionTitles, onNext, onPrev }: ToolHelpModalProps) {
  const [mounted, setMounted] = useState(false);
  const toolDetails = tool?.details;
  const Icon = tool?.icon ? toolIconMap[tool.icon] : null;
  const titles = sectionTitles || {
    introduction: "工具介绍",
    usage: "使用场景",
    outcome: "你会得到",
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen || !toolDetails) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Modal Container */}
      <div 
        className="relative w-full md:w-[900px] md:h-[660px] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[88vh] md:max-h-none animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 p-2 rounded-full bg-white/50 dark:bg-black/20 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Panel (Desktop) / Top Panel (Mobile) - Hero Section */}
        <div className="relative w-full md:w-[280px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#252525] dark:to-[#1a1a1a] p-4 md:p-8 flex flex-row md:flex-col items-center justify-start md:justify-center text-left md:text-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-[#333333] shrink-0 gap-4 md:gap-0">
            <div className="w-12 h-12 md:w-20 md:h-20 bg-white dark:bg-[#2C2C2C] rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center md:mb-6 text-[#060E9F] dark:text-blue-400 transform rotate-0 md:rotate-3 shrink-0">
                {Icon && <Icon className="w-6 h-6 md:w-10 md:h-10" />}
            </div>
            
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white leading-none md:leading-tight pr-8 md:pr-0 pb-0 md:pb-8 whitespace-nowrap">
                {toolDetails.title || tool?.name}
            </h2>

            <div className="absolute bottom-[-12px] left-4 md:bottom-4 z-20">
                {onPrev && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPrev();
                        }}
                        className="p-2 rounded-full bg-white/80 dark:bg-black/40 text-gray-500 hover:text-[#060E9F] dark:text-gray-400 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-[#333333] transition-all shadow-sm backdrop-blur-sm border border-gray-100 dark:border-[#333333]"
                        title="上一个"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="sr-only">上一个</span>
                    </button>
                )}
            </div>

            <div className="absolute bottom-[-12px] right-4 md:bottom-4 z-20">
                {onNext && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onNext();
                        }}
                        className="p-2 rounded-full bg-white/80 dark:bg-black/40 text-gray-500 hover:text-[#060E9F] dark:text-gray-400 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-[#333333] transition-all shadow-sm backdrop-blur-sm border border-gray-100 dark:border-[#333333]"
                        title="下一个"
                    >
                        <ChevronRight className="w-5 h-5" />
                        <span className="sr-only">下一个</span>
                    </button>
                )}
            </div>
        </div>

        {/* Right Panel (Desktop) / Bottom Panel (Mobile) - Content Section */}
        <div className="relative w-full md:flex-1 p-4 md:p-5 overflow-y-auto custom-scrollbar">
            <div className="space-y-6 px-3 md:px-4">
                {/* Description */}
                <div className="animate-in slide-in-from-bottom-2 duration-500 delay-100">
                    <h3 className="text-lg font-bold text-[#060E9F] dark:text-blue-400 mb-3 flex items-center">
                        <span className="w-1 h-4 bg-[#060E9F] dark:bg-blue-500 mr-2 rounded-full"></span>
                        {titles.introduction}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-5 md:leading-6">
                        {renderText(toolDetails.introduction)}
                    </p>
                </div>

                {/* Usage Scenario */}
                {toolDetails.usage && (
                    <div className="animate-in slide-in-from-bottom-2 duration-500 delay-200">
                         <h3 className="text-lg font-bold text-[#060E9F] dark:text-blue-400 mb-3 flex items-center">
                            <span className="w-1 h-4 bg-[#060E9F] dark:bg-blue-500 mr-2 rounded-full"></span>
                            {titles.usage}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-5 md:leading-6">
                            {renderText(toolDetails.usage)}
                        </p>
                    </div>
                )}

                {/* You Will Get (Outcome) */}
                {toolDetails.outcome && (
                    <div className="animate-in slide-in-from-bottom-2 duration-500 delay-300">
                         <h3 className="text-lg font-bold text-[#060E9F] dark:text-blue-400 mb-3 flex items-center">
                            <span className="w-1 h-4 bg-[#060E9F] dark:bg-blue-500 mr-2 rounded-full"></span>
                            {titles.outcome}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-5 md:leading-6">
                            {renderText(toolDetails.outcome)}
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
