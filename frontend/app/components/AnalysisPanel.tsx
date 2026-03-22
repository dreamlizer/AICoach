import React from "react";
import { Message } from "@/lib/types";

interface AnalysisPanelProps {
  debugInfo: NonNullable<Message["debugInfo"]>;
}

export function AnalysisPanel({ debugInfo }: AnalysisPanelProps) {
  const keywords = debugInfo.stage1?.keywords ?? [];
  return (
    <div className="w-full max-w-5xl rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card p-0 shadow-sm animate-in fade-in slide-in-from-bottom-2 overflow-hidden flex flex-col divide-y divide-gray-200 dark:divide-dark-border">
      
      {/* Row 1: Stage 1 & Stage 2 */}
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-dark-border">
        {/* Column 1: Stage 1 Analysis */}
        <div className="flex-1 p-4 bg-white/50 dark:bg-transparent min-w-0 md:min-w-[200px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">
              <span>👂</span> 听觉分析 (Stage 1)
            </h3>
            {debugInfo.model_info && (
               <span className="text-[10px] text-gray-400 dark:text-dark-text-muted bg-gray-100 dark:bg-dark-sidebar px-1.5 py-0.5 rounded">
                 {debugInfo.model_info.stage1}
               </span>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] text-gray-400 dark:text-dark-text-muted uppercase">
                  Intent
                </span>
                <span className="font-mono font-medium text-gray-800 dark:text-dark-text-primary">
                  {debugInfo.stage1.intent}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 dark:text-dark-text-muted uppercase">
                  Complexity
                </span>
                <span
                  className={`font-mono font-medium ${
                    debugInfo.stage1.complexity === "HIGH"
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {debugInfo.stage1.complexity}
                </span>
              </div>
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 dark:text-dark-text-muted uppercase">
                Sentiment
              </span>
              <span className="text-gray-800 dark:text-dark-text-primary">
                {debugInfo.stage1.sentiment}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 dark:text-dark-text-muted uppercase">
                Keywords
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-white dark:bg-dark-sidebar px-1.5 py-0.5 text-xs border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary"
                  >
                    {kw}
                  </span>
                ))}
                {keywords.length === 0 && (
                  <span className="text-xs text-gray-400 dark:text-dark-text-muted">无关键词</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Stage 2 Memory */}
        <div className="flex-1 p-4 bg-gray-50/50 dark:bg-dark-sidebar/30 min-w-0 md:min-w-[200px]">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">
            <span>🧠</span> 记忆回溯 (Stage 2)
          </h3>
          <div className="rounded-lg bg-white dark:bg-dark-sidebar border border-gray-100 dark:border-dark-border p-3 text-xs text-gray-600 dark:text-dark-text-secondary font-mono whitespace-pre-wrap h-[160px] overflow-y-auto">
            {debugInfo.stage2_memory || "无历史记忆"}
          </div>
        </div>
      </div>

      {/* Row 2: Stage 3 Strategy (Full Width) */}
      <div className="w-full p-4 bg-white/50 dark:bg-transparent">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">
            <span>🧠</span> 军师策略 (Stage 3)
          </h3>
          {debugInfo.model_info && (
             <span className="text-[10px] text-gray-400 dark:text-dark-text-muted bg-gray-100 dark:bg-dark-sidebar px-1.5 py-0.5 rounded">
               {debugInfo.model_info.stage3}
             </span>
          )}
        </div>
        <div className="rounded-lg bg-white dark:bg-dark-sidebar border border-gray-100 dark:border-dark-border p-3 text-xs text-gray-600 dark:text-dark-text-secondary font-mono whitespace-pre-wrap h-auto min-h-[100px] overflow-y-auto">
          {debugInfo.stage3_strategy || "简单模式 - 跳过思考"}
        </div>
      </div>

      {/* Row 3: Stage 4 Model Info */}
      <div className="w-full p-4 bg-gray-50/50 dark:bg-dark-sidebar/30 border-t border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between">
             <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">
              <span>💬</span> 表达生成 (Stage 4)
            </h3>
            {debugInfo.model_info && (
               <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/30">
                 当前模型: {debugInfo.model_info.stage4}
               </span>
            )}
        </div>
      </div>

      {/* Row 4: Statistics */}
      {debugInfo.stats && (
        <div className="w-full p-4 bg-white dark:bg-dark-sidebar border-t border-gray-200 dark:border-dark-border">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary mb-3">
            <span>📊</span> 消耗统计 (Stats)
          </h3>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="space-y-1 p-2 rounded bg-gray-50 dark:bg-dark-card/50">
              <span className="block text-[10px] text-gray-400 dark:text-dark-text-muted uppercase tracking-wider">Stage 1</span>
              <div className="font-mono font-medium text-gray-700 dark:text-dark-text-primary">{debugInfo.stats.stage1.duration}</div>
              <div className="font-mono text-[10px] text-gray-500 dark:text-dark-text-secondary break-all">{debugInfo.stats.stage1.tokens}</div>
            </div>
            <div className="space-y-1 p-2 rounded bg-gray-50 dark:bg-dark-card/50">
              <span className="block text-[10px] text-gray-400 dark:text-dark-text-muted uppercase tracking-wider">Stage 3</span>
              <div className="font-mono font-medium text-gray-700 dark:text-dark-text-primary">{debugInfo.stats.stage3.duration}</div>
              <div className="font-mono text-[10px] text-gray-500 dark:text-dark-text-secondary break-all">{debugInfo.stats.stage3.tokens}</div>
            </div>
            <div className="space-y-1 p-2 rounded bg-gray-50 dark:bg-dark-card/50">
              <span className="block text-[10px] text-gray-400 dark:text-dark-text-muted uppercase tracking-wider">Stage 4</span>
              <div className="font-mono font-medium text-gray-700 dark:text-dark-text-primary">{debugInfo.stats.stage4.duration}</div>
              <div className="font-mono text-[10px] text-gray-500 dark:text-dark-text-secondary break-all">{debugInfo.stats.stage4.tokens}</div>
            </div>
            <div className="space-y-1 p-2 rounded bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
              <span className="block text-[10px] text-blue-400 dark:text-blue-300 uppercase tracking-wider font-bold">Total</span>
              <div className="font-mono font-bold text-blue-700 dark:text-blue-200">{debugInfo.stats.total.duration}</div>
              <div className="font-mono text-[10px] text-blue-600 dark:text-blue-300 break-all">{debugInfo.stats.total.tokens}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Stage 5 Removed/Hidden as per user request */}
    </div>
  );
}
