import React from "react";
import { ChevronRight, Target, Stethoscope } from "lucide-react";
import { ExecutiveTool } from "@/lib/executive_tools";

type ExecutiveToolsProps = {
  tools: ExecutiveTool[];
  onOpenLibrary: () => void;
  onToolClick: (tool: ExecutiveTool) => void;
};

const iconMap = {
  target: Target,
  stethoscope: Stethoscope
};

export function ExecutiveTools({ tools, onOpenLibrary, onToolClick }: ExecutiveToolsProps) {
  return (
    <div className="py-2 px-1">
      <button 
        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors group mb-1"
        onClick={onOpenLibrary}
      >
        <span className="uppercase tracking-wider">高管思维工具</span>
        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      
      <div className="space-y-0.5">
        {tools.slice(0, 3).map((tool) => {
          const Icon = iconMap[tool.icon];
          return (
            <button 
              key={tool.id}
              className="flex items-center w-full px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors gap-3 group"
              onClick={() => onToolClick(tool)}
            >
              <Icon className="w-4 h-4 text-[#060E9F] dark:text-blue-400" />
              <span>{tool.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
