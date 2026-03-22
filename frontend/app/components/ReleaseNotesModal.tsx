"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Rocket, Calendar, CheckCircle2, History } from "lucide-react";
import { releaseNotes, latestVersion } from "@/lib/release_notes";

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "latest" | "history"; // 'latest' shows just the new one (popup), 'history' shows all
}

export function ReleaseNotesModal({ isOpen, onClose, mode = "latest" }: ReleaseNotesModalProps) {
  const [mounted, setMounted] = useState(false);

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

  if (!mounted || !isOpen) return null;

  const notesToShow = mode === "latest" 
    ? [releaseNotes.find(n => n.version === latestVersion) || releaseNotes[0]] 
    : releaseNotes;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div 
        className="relative w-full md:w-[600px] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 dark:border-[#333333] bg-gradient-to-r from-gray-50 to-white dark:from-[#252525] dark:to-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#060E9F]/10 dark:bg-blue-500/20 rounded-xl text-[#060E9F] dark:text-blue-400">
              {mode === "latest" ? <Rocket className="w-6 h-6" /> : <History className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {mode === "latest" ? "新版本发布" : "更新历史"}
              </h2>
              {mode === "latest" && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  v{latestVersion}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
          {notesToShow.map((note, index) => (
            <div key={note.version} className={`p-4 md:p-6 ${index !== notesToShow.length - 1 ? 'border-b border-gray-100 dark:border-[#333333]' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-[#060E9F] text-white text-xs font-bold rounded-md">
                    v{note.version}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {note.date}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {note.title}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                {note.description}
              </p>

              <div className="space-y-4">
                {note.highlights.map((highlight, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-[#2C2C2C] p-4 rounded-xl border border-gray-100 dark:border-[#333333]">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#060E9F] dark:text-blue-400" />
                      {highlight.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 pl-6 leading-relaxed">
                      {highlight.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-[#333333] bg-gray-50/50 dark:bg-[#252525]">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#060E9F] hover:bg-[#060E9F]/90 text-white font-medium rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
          >
            {mode === "latest" ? "我知道了" : "关闭"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
