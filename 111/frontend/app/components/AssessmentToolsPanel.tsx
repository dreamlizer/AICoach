import React, { useState } from "react";
import { assessmentTools } from "@/lib/tools_registry";
import { toolIconMap } from "@/app/components/Icons";
import { ExecutiveTool } from "@/lib/types";
import { HelpCircle } from "lucide-react";
import { ToolHelpModal } from "./ToolHelpModal";

interface AssessmentToolsPanelProps {
  onToolSelect: (tool: ExecutiveTool) => void;
}

export function AssessmentToolsPanel({ onToolSelect }: AssessmentToolsPanelProps) {
  const [helpToolId, setHelpToolId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visibleTools = assessmentTools;
  const disabledToolIds = new Set(["hogan", "enneagram"]);

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
      {/* Container with Light Background (White) but Cards are Dark */}
      <div className="w-full rounded-2xl bg-white dark:bg-[#000000] p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative">
        {notice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/80 text-white text-xs px-3 py-1.5">
            {notice}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {assessmentTools.map((tool) => {
            const Icon = toolIconMap[tool.icon];
            const isDisabled = disabledToolIds.has(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => {
                  if (isDisabled) {
                    setNotice("正在建设中，敬请期待");
                    window.setTimeout(() => setNotice(null), 1200);
                    return;
                  }
                  onToolSelect(tool);
                }}
                className="group relative flex flex-col overflow-hidden rounded-xl bg-[#0f172a] dark:bg-[#111111] p-4 text-left transition-all hover:bg-[#1e293b] hover:ring-2 hover:ring-[#FFBF3F]/50 hover:shadow-2xl hover:-translate-y-1 min-h-[150px] sm:min-h-[160px] md:min-h-[170px]"
              >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-[#FFBF3F]/5 blur-2xl group-hover:bg-[#FFBF3F]/10 transition-all"></div>
                
                <div className="relative z-10 flex flex-col">
                  <div 
                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-[#FFBF3F] transition-colors rounded-full hover:bg-white/10 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHelpToolId(tool.id);
                    }}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#334155] text-white shadow-lg group-hover:bg-[#FFBF3F] group-hover:text-[#0f172a] transition-all duration-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      {isDisabled && (
                        <div className="rounded-full bg-white/10 text-white text-xs px-2 py-1">
                          建设中
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg md:text-base font-bold text-white mb-1 group-hover:text-[#FFBF3F] transition-colors">{tool.name}</h3>
                    <p className="text-sm md:text-xs text-slate-400 leading-relaxed line-clamp-4 group-hover:text-slate-300">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <ToolHelpModal 
        isOpen={!!helpToolId}
        onClose={() => setHelpToolId(null)}
        tool={helpToolId ? (assessmentTools.find(t => t.id === helpToolId) || null) : null}
        sectionTitles={{
          introduction: "原理解码",
          usage: "关键校准时刻",
          outcome: "你的内参收益",
        }}
        onNext={() => handleNavigate("next")}
        onPrev={() => handleNavigate("prev")}
      />
    </div>
  );
}
