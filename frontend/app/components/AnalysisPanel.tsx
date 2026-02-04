import React from "react";
import { Message } from "@/lib/types";

interface AnalysisPanelProps {
  debugInfo: NonNullable<Message["debugInfo"]>;
}

export function AnalysisPanel({ debugInfo }: AnalysisPanelProps) {
  return (
    <div className="w-full max-w-5xl rounded-xl border border-gray-200 bg-gray-50 p-0 shadow-sm animate-in fade-in slide-in-from-bottom-2 overflow-hidden flex flex-col divide-y divide-gray-200">
      
      {/* Row 1: Stage 1 & Stage 2 */}
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* Column 1: Stage 1 Analysis */}
        <div className="flex-1 p-4 bg-white/50 min-w-0 md:min-w-[200px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <span>👂</span> 听觉分析 (Stage 1)
            </h3>
            {debugInfo.model_info && (
               <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                 {debugInfo.model_info.stage1}
               </span>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">
                  Intent
                </span>
                <span className="font-mono font-medium text-gray-800">
                  {debugInfo.stage1.intent}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase">
                  Complexity
                </span>
                <span
                  className={`font-mono font-medium ${
                    debugInfo.stage1.complexity === "HIGH"
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {debugInfo.stage1.complexity}
                </span>
              </div>
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 uppercase">
                Sentiment
              </span>
              <span className="text-gray-800">
                {debugInfo.stage1.sentiment}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 uppercase">
                Keywords
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {debugInfo.stage1.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-white px-1.5 py-0.5 text-xs border border-gray-200 text-gray-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Stage 2 Memory */}
        <div className="flex-1 p-4 bg-gray-50/50 min-w-0 md:min-w-[200px]">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <span>🧠</span> 记忆回溯 (Stage 2)
          </h3>
          <div className="rounded-lg bg-white border border-gray-100 p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap h-[160px] overflow-y-auto">
            {debugInfo.stage2_memory || "无历史记忆"}
          </div>
        </div>
      </div>

      {/* Row 2: Stage 3 Strategy (Full Width) */}
      <div className="w-full p-4 bg-white/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <span>🧠</span> 军师策略 (Stage 3)
          </h3>
          {debugInfo.model_info && (
             <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
               {debugInfo.model_info.stage3}
             </span>
          )}
        </div>
        <div className="rounded-lg bg-white border border-gray-100 p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap h-auto min-h-[100px] overflow-y-auto">
          {debugInfo.stage3_strategy || "简单模式 - 跳过思考"}
        </div>
      </div>

      {/* Row 3: Stage 4 Model Info */}
      <div className="w-full p-4 bg-gray-50/50 border-t border-gray-200">
        <div className="flex items-center justify-between">
             <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <span>💬</span> 表达生成 (Stage 4)
            </h3>
            {debugInfo.model_info && (
               <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                 当前模型: {debugInfo.model_info.stage4}
               </span>
            )}
        </div>
      </div>
      
      {/* Stage 5 Removed/Hidden as per user request */}
    </div>
  );
}
