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
  { id: "self", title: "一、看自己 (修内功)" },
  { id: "team", title: "二、看别人 (带队伍)" },
  { id: "system", title: "三、看系统 (控大局)" },
  { id: "partner", title: "四、组织合伙人" },
  { id: "magic", title: "五、魔法区 (隐藏)" },
] as const;

export function ToolsPanel({ onToolSelect, onAssessmentSelect, showMagicZone = false }: ToolsPanelProps) {
  const [helpToolId, setHelpToolId] = useState<string | null>(null);

  const getVisibleTools = () => {
    return categories
      .filter(c => c.id !== "magic" || showMagicZone)
      .flatMap(c => executiveTools.filter(t => t.category === c.id));
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!helpToolId) return;
    const tools = getVisibleTools();
    const currentIndex = tools.findIndex(t => t.id === helpToolId);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % tools.length;
    } else {
      newIndex = (currentIndex - 1 + tools.length) % tools.length;
    }
    setHelpToolId(tools[newIndex].id);
  };

  return (
    <div className="w-full space-y-6">
      <AssessmentToolsPanel onToolSelect={onAssessmentSelect} />

      {categories.map((category) => {
        if (category.id === "magic" && !showMagicZone) return null;
        
        const categoryTools = executiveTools.filter((t) => t.category === category.id);
        
        if (categoryTools.length === 0) return null;

        return (
      <div key={category.id} className="w-full rounded-2xl border border-gray-100 dark:border-[#333333] bg-white dark:bg-[#1E1E1E] p-3 md:p-5 shadow-sm">
        <div className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-[#333333] pb-3 mb-4">
          {category.title}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {categoryTools.map((tool) => {
            const Icon = toolIconMap[tool.icon];
            return (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool)}
                className="relative flex flex-col gap-1.5 rounded-xl border border-gray-100 dark:border-[#333333] bg-[#F8F9FA] dark:bg-[#2C2C2C] p-2 md:p-3 text-left transition-all hover:border-[#060E9F]/30 hover:bg-white dark:hover:bg-[#1E1E1E] hover:shadow-sm"
              >
                <div 
                  className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-[#060E9F] dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-[#333333] z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHelpToolId(tool.id);
                  }}
                >
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="flex items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#1E1E1E] text-[#060E9F] dark:text-blue-400 shadow-sm shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-start gap-1">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{tool.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight md:leading-relaxed line-clamp-4 h-[5.6em] md:h-[6.5em]">{tool.description}</div>
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
        tool={helpToolId ? (executiveTools.find(t => t.id === helpToolId) || null) : null}
        onNext={() => handleNavigate('next')}
        onPrev={() => handleNavigate('prev')}
      />
    </div>
  );
}
