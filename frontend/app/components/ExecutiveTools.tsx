import React from "react";
import { Brain, ChevronRight, LayoutGrid, Map } from "lucide-react";
import { useLanguage } from "@/context/language-context";

type ExecutiveToolsProps = {
  onOpenLibrary: () => void;
  onAssessmentClick: () => void;
  onSuperMapClick: () => void;
};

export function ExecutiveTools({ onOpenLibrary, onAssessmentClick, onSuperMapClick }: ExecutiveToolsProps) {
  const { t } = useLanguage();

  return (
    <div className="py-2 px-1">
      <button 
        className="flex items-center justify-between w-full px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors group mb-1"
        onClick={onOpenLibrary}
      >
        <div className="flex flex-col">
          <span className="uppercase tracking-wider">{t('toolLibrary')}</span>
          <div className="mt-1 h-[2px] w-8 bg-[#FFBF3F] dark:bg-yellow-500/80"></div>
        </div>
        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      
      <div className="space-y-0.5">
        <button
          className="flex items-center w-full px-2 py-2 text-[0.8125rem] font-medium text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors gap-3 group"
          onClick={onAssessmentClick}
        >
          <Brain className="w-4 h-4 text-[#060E9F] dark:text-blue-400" />
          <span>性格评测</span>
        </button>

        <button
          className="flex items-center w-full px-2 py-2 text-[0.8125rem] font-medium text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors gap-3 group"
          onClick={onSuperMapClick}
        >
          <Map className="w-4 h-4 text-[#060E9F] dark:text-blue-400" />
          <span>超级地图</span>
        </button>
        
        <button 
          className="flex items-center w-full px-2 py-2 text-[0.8125rem] font-medium text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors gap-3 group"
          onClick={onOpenLibrary}
        >
          <LayoutGrid className="w-4 h-4 text-[#060E9F] dark:text-blue-400" />
          <span>{t('moreTools')}</span>
        </button>
      </div>
    </div>
  );
}
