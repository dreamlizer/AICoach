"use client";

import React, { useState } from "react";
import { ArrowRight, BrainCircuit, HelpCircle, LayoutGrid, Sparkles, Zap } from "lucide-react";
import { assessmentTools } from "@/lib/tools_registry";
import { ExecutiveTool } from "@/lib/types";
import { ToolHelpModal } from "./ToolHelpModal";

interface AssessmentToolsPanelProps {
  onToolSelect: (tool: ExecutiveTool) => void;
}

const toolAccentMap: Record<string, string> = {
  mbti: "#d9a15e",
  "4d-leadership": "#74b8ac",
  pdp: "#d8899d",
};

const toolIconMap: Record<string, React.ReactNode> = {
  mbti: <BrainCircuit className="h-5 w-5" />,
  "4d-leadership": <LayoutGrid className="h-5 w-5" />,
  pdp: <Zap className="h-5 w-5" />,
};

const toolTitleMap: Record<string, string> = {
  mbti: "MBTI 性格类型",
  "4d-leadership": "4D 协作风格",
  pdp: "PDP 行为风格",
};

const toolCopyMap: Record<string, string> = {
  mbti: "从认知偏好、相处方式和能量来源切入，帮助你更清楚地理解自己的思考习惯。",
  "4d-leadership": "更适合放在团队协作、管理风格和领导方式的观察里，用来看你如何带人和配合。",
  pdp: "聚焦行为风格、执行节奏和工作状态，适合看你在职场中的自然出手方式。",
};

export function AssessmentToolsPanel({ onToolSelect }: AssessmentToolsPanelProps) {
  const [helpToolId, setHelpToolId] = useState<string | null>(null);
  const visibleTools = assessmentTools.filter((tool) => ["mbti", "4d-leadership", "pdp"].includes(tool.id));

  const handleNavigate = (direction: "next" | "prev") => {
    if (!helpToolId) return;
    const currentIndex = visibleTools.findIndex((tool) => tool.id === helpToolId);
    if (currentIndex === -1) return;

    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % visibleTools.length
        : (currentIndex - 1 + visibleTools.length) % visibleTools.length;

    setHelpToolId(visibleTools[nextIndex]?.id || null);
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-[34px] border border-[var(--site-border)] bg-[#1f1716] p-5 shadow-[0_18px_42px_rgba(35,23,28,0.12)]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {visibleTools.map((tool) => {
            const accent = toolAccentMap[tool.id] || "#b6b0aa";
            const icon = toolIconMap[tool.id] || <Sparkles className="h-5 w-5" />;

            return (
              <article
                key={tool.id}
                onClick={() => onToolSelect(tool)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToolSelect(tool);
                  }
                }}
                role="button"
                tabIndex={0}
                className="site-hover-card group relative flex min-h-[320px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#221a19] p-6 text-left text-[#fff8f1] shadow-[0_20px_48px_rgba(25,16,18,0.18)]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[4px]"
                  style={{ background: `linear-gradient(90deg, ${accent} 0%, transparent 82%)` }}
                />
                <div
                  className="pointer-events-none absolute -right-12 -top-6 h-40 w-40 opacity-80 blur-3xl"
                  style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 68%)` }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_35%,rgba(255,255,255,0.02)_100%)]" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                      style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, ${accent}33 180%)` }}
                    >
                      {icon}
                    </div>

                    <button
                      className="site-hover-chip rounded-full border border-white/10 bg-white/6 p-2 text-[#e7d8cb] hover:border-white/20 hover:bg-white/10"
                      onClick={(event) => {
                        event.stopPropagation();
                        setHelpToolId(tool.id);
                      }}
                      aria-label={`查看 ${toolTitleMap[tool.id] || tool.name} 介绍`}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-7">
                    <h3 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.05em] text-white md:text-[34px]">
                      {toolTitleMap[tool.id] || tool.name}
                    </h3>
                    <p className="mt-5 max-w-[18ch] text-[15px] leading-[1.9] text-[#dbcbbf]">
                      {toolCopyMap[tool.id] || tool.description}
                    </p>
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[12px] text-[#d5c4b6]">
                      功能介绍
                    </span>

                    <div className="site-hover-chip inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-2 text-[14px] font-semibold text-[#221a19] shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
                      <span>进入测评</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <ToolHelpModal
        isOpen={!!helpToolId}
        onClose={() => setHelpToolId(null)}
        tool={helpToolId ? visibleTools.find((tool) => tool.id === helpToolId) || null : null}
        sectionTitles={{
          introduction: "功能介绍",
          usage: "适合怎么用",
          outcome: "你会得到什么",
        }}
        onNext={() => handleNavigate("next")}
        onPrev={() => handleNavigate("prev")}
      />
    </div>
  );
}
