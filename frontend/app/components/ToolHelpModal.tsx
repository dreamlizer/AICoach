"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

const renderText = (text: string | undefined) => {
  if (!text) return null;
  return text.split("\n").map((line, lineIndex, lines) => (
    <React.Fragment key={`${line}-${lineIndex}`}>
      {line.split(/(\*\*.*?\*\*)/g).map((part, partIndex) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIndex} className="font-semibold text-[var(--site-text)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={partIndex}>{part}</React.Fragment>;
      })}
      {lineIndex < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
};

export function ToolHelpModal({ isOpen, onClose, tool, sectionTitles, onNext, onPrev }: ToolHelpModalProps) {
  const [mounted, setMounted] = useState(false);
  const toolDetails = tool?.details;
  const Icon = tool?.icon ? toolIconMap[tool.icon] : null;
  const titles = sectionTitles || {
    introduction: "功能介绍",
    usage: "适合怎么用",
    outcome: "你会得到什么",
  };

  const sections = useMemo(() => {
    if (!toolDetails) return [];
    if (toolDetails.sections && toolDetails.sections.length) {
      return toolDetails.sections.filter((s) => s.heading?.trim() && s.content?.trim());
    }
    const next = [
      { heading: titles.introduction, content: toolDetails.introduction || "" },
      { heading: titles.usage, content: toolDetails.usage || "" },
      { heading: titles.outcome, content: toolDetails.outcome || "" },
    ];
    return next.filter((s) => s.content.trim());
  }, [toolDetails, titles.introduction, titles.outcome, titles.usage]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen || !toolDetails) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[28px] border border-[var(--site-border-strong)] bg-[var(--site-panel-strong)] shadow-[0_32px_120px_rgba(45,23,35,0.2)] md:h-[660px] md:w-[900px] md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/72 p-2 text-[var(--site-text-soft)] transition hover:bg-white hover:text-[var(--site-accent-strong)] md:right-4 md:top-4"
          aria-label="关闭说明弹窗"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex w-full flex-row items-center gap-4 border-b border-[var(--site-border)] bg-[var(--site-bg-soft)] p-4 md:w-[280px] md:flex-col md:justify-center md:border-b-0 md:border-r md:p-8 md:text-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--site-accent-strong)] shadow-sm md:h-20 md:w-20">
            {Icon ? <Icon className="h-6 w-6 md:h-10 md:w-10" /> : null}
          </div>

          <div className="pr-8 md:pr-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--site-accent-strong)]">功能说明</div>
            <h2 className="mt-2 text-lg font-semibold leading-tight text-[var(--site-text)] md:text-2xl">
              {toolDetails.title || tool?.name}
            </h2>
          </div>

          <div className="absolute bottom-[-14px] left-4 z-20 md:bottom-4">
            {onPrev ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                className="rounded-full border border-[var(--site-border)] bg-white/90 p-2 text-[var(--site-text-soft)] shadow-sm transition hover:border-[var(--site-border-strong)] hover:text-[var(--site-accent-strong)]"
                title="上一个"
                aria-label="查看上一个功能"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <div className="absolute bottom-[-14px] right-4 z-20 md:bottom-4">
            {onNext ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="rounded-full border border-[var(--site-border)] bg-white/90 p-2 text-[var(--site-text-soft)] shadow-sm transition hover:border-[var(--site-border-strong)] hover:text-[var(--site-accent-strong)]"
                title="下一个"
                aria-label="查看下一个功能"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="custom-scrollbar w-full overflow-y-auto p-4 md:flex-1 md:p-6">
          <div className="space-y-6 px-3 md:px-4">
            {sections.map((section) => (
              <div key={section.heading}>
                <h3 className="mb-3 flex items-center text-lg font-semibold text-[var(--site-accent-strong)]">
                  <span className="mr-2 h-4 w-1 rounded-full bg-[var(--site-accent)]"></span>
                  {section.heading}
                </h3>
                <p className="text-sm leading-7 text-[var(--site-text-soft)]">{renderText(section.content)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

