"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Rocket, Calendar, CheckCircle2, History } from "lucide-react";
import { releaseNotes, latestVersion } from "@/lib/release_notes";

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "latest" | "history";
}

export function ReleaseNotesModal({ isOpen, onClose, mode = "latest" }: ReleaseNotesModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const notesToShow = mode === "latest" ? [releaseNotes.find((note) => note.version === latestVersion) || releaseNotes[0]] : releaseNotes;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300 sm:p-6">
      <div
        className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 animate-in fade-in zoom-in-95 dark:bg-[#1E1E1E] md:w-[600px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 dark:border-[#333333] dark:from-[#252525] dark:to-[#1E1E1E] md:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#060E9F]/10 p-2 text-[#060E9F] dark:bg-blue-500/20 dark:text-blue-400">
              {mode === "latest" ? <Rocket className="h-6 w-6" /> : <History className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white md:text-xl">
                {mode === "latest" ? "新版本发布" : "更新历史"}
              </h2>
              {mode === "latest" ? <p className="font-mono text-xs text-gray-500 dark:text-gray-400">v{latestVersion}</p> : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#2C2C2C]"
            aria-label="关闭更新说明"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-0">
          {notesToShow.map((note, index) => (
            <div
              key={note.version}
              className={`p-4 md:p-6 ${
                index !== notesToShow.length - 1 ? "border-b border-gray-100 dark:border-[#333333]" : ""
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#060E9F] px-2 py-1 text-xs font-bold text-white">v{note.version}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {note.date}
                  </span>
                </div>
              </div>

              <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{note.title}</h3>
              <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{note.description}</p>

              <div className="space-y-4">
                {note.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#2C2C2C]"
                  >
                    <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-[#060E9F] dark:text-blue-400" />
                      {highlight.title}
                    </h4>
                    <p className="pl-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{highlight.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 bg-gray-50/50 p-5 dark:border-[#333333] dark:bg-[#252525]">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#060E9F] py-3 font-medium text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#060E9F]/90 active:scale-[0.98]"
          >
            {mode === "latest" ? "我知道了" : "关闭"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
