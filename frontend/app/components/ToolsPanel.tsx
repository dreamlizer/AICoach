import React, { useState } from "react";
import { executiveTools } from "@/lib/tools_registry";
import { ExecutiveTool } from "@/lib/types";
import { toolIconMap } from "@/app/components/Icons";
import { HelpCircle } from "lucide-react";
import { ToolHelpModal } from "./ToolHelpModal";
import { AssessmentToolsPanel } from "./AssessmentToolsPanel";

interface ToolsPanelProps {
  onToolSelect: (tool: ExecutiveTool) => void;
  onAssessmentSelect: (tool: ExecutiveTool) => void;
  showMagicZone?: boolean;
}

const categories = [
  { id: "self", title: "一、看自己（修内功）" },
  { id: "team", title: "二、看别人（带团队）" },
  { id: "system", title: "三、看系统（控大局）" },
  { id: "partner", title: "四、组织合伙人" },
  { id: "magic", title: "五、魔法区（隐藏）" },
] as const;

export function ToolsPanel({ onToolSelect, onAssessmentSelect, showMagicZone = false }: ToolsPanelProps) {
  const [helpToolId, setHelpToolId] = useState<string | null>(null);

  const getVisibleTools = () =>
    categories
      .filter((category) => category.id !== "magic" || showMagicZone)
      .flatMap((category) => executiveTools.filter((tool) => tool.category === category.id));

  const handleNavigate = (direction: "next" | "prev") => {
    if (!helpToolId) return;
    const tools = getVisibleTools();
    const currentIndex = tools.findIndex((tool) => tool.id === helpToolId);
    if (currentIndex === -1) return;

    const newIndex = direction === "next" ? (currentIndex + 1) % tools.length : (currentIndex - 1 + tools.length) % tools.length;
    setHelpToolId(tools[newIndex].id);
  };

  return (
    <div className="w-full space-y-6">
      <AssessmentToolsPanel onToolSelect={onAssessmentSelect} />

      {categories.map((category) => {
        if (category.id === "magic" && !showMagicZone) return null;

        const categoryTools = executiveTools.filter((tool) => tool.category === category.id);
        if (categoryTools.length === 0) return null;

        return (
          <div
            key={category.id}
            className="w-full rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-[#333333] dark:bg-[#1E1E1E] md:p-5"
          >
            <div className="mb-4 border-b border-gray-100 pb-3 text-sm font-bold uppercase tracking-wider text-gray-900 dark:border-[#333333] dark:text-gray-100">
              {category.title}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              {categoryTools.map((tool) => {
                const Icon = toolIconMap[tool.icon];

                return (
                  <button
                    key={tool.id}
                    onClick={() => onToolSelect(tool)}
                    className="relative flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-[#F8F9FA] p-2 text-left transition-all hover:border-[#060E9F]/30 hover:bg-white hover:shadow-sm dark:border-[#333333] dark:bg-[#2C2C2C] dark:hover:bg-[#1E1E1E] md:p-3"
                  >
                    <div
                      className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-[#060E9F] dark:hover:bg-[#333333] dark:hover:text-blue-400"
                      onClick={(event) => {
                        event.stopPropagation();
                        setHelpToolId(tool.id);
                      }}
                      aria-label={`查看 ${tool.name} 介绍`}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </div>

                    <div className="flex items-center">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#060E9F] shadow-sm dark:bg-[#1E1E1E] dark:text-blue-400">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-start gap-1">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{tool.name}</div>
                      <div className="line-clamp-4 h-[5.6em] text-xs leading-tight text-gray-500 dark:text-gray-400 md:h-[6.5em] md:leading-relaxed">
                        {tool.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <ToolHelpModal
        isOpen={!!helpToolId}
        onClose={() => setHelpToolId(null)}
        tool={helpToolId ? executiveTools.find((tool) => tool.id === helpToolId) || null : null}
        onNext={() => handleNavigate("next")}
        onPrev={() => handleNavigate("prev")}
      />
    </div>
  );
}
