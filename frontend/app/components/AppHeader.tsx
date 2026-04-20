import React from "react";
import { Eye, EyeOff, Hammer, Menu, X } from "lucide-react";
import { ProjectLogo } from "@/app/components/ProjectLogo";
import { UserMenu } from "@/app/components/UserMenu";
import { getToolById } from "@/lib/tools_registry";
import { toolIconMap } from "@/app/components/Icons";

interface AppHeaderProps {
  sidebarOpen: boolean;
  onSidebarOpen: () => void;
  toolsPanelOpen: boolean;
  activeToolId: string | null;
  isSuperAdmin: boolean;
  showDebugInfo: boolean;
  setShowDebugInfo: (show: boolean) => void;
  onOpenHome?: () => void;
}

export function AppHeader({
  sidebarOpen,
  onSidebarOpen,
  toolsPanelOpen,
  activeToolId,
  isSuperAdmin,
  showDebugInfo,
  setShowDebugInfo,
  onOpenHome,
}: AppHeaderProps) {
  return (
    <>
      <div className="absolute left-2 top-2 z-20 flex items-center md:left-4 md:top-4">
        {!sidebarOpen ? (
          <button
            onClick={onSidebarOpen}
            className="mr-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#060E9F]/10 bg-white text-[#060E9F] shadow-sm hover:bg-gray-50 dark:border-[#333333] dark:bg-[#1E1E1E] dark:text-blue-400 dark:hover:bg-[#0F0F0F] md:h-10 md:w-10"
            aria-label="打开侧边栏"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        {toolsPanelOpen ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#060E9F] text-white shadow-sm md:h-12 md:w-12">
            <Hammer className="h-5 w-5 md:h-7 md:w-7" />
          </div>
        ) : activeToolId ? (
          (() => {
            const tool = getToolById(activeToolId);
            const Icon = tool ? toolIconMap[tool.icon] : null;
            return Icon ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#060E9F] text-white shadow-sm md:h-12 md:w-12">
                <Icon className="h-5 w-5 md:h-7 md:w-7" />
              </div>
            ) : (
              <div className="relative h-8 w-8 shrink-0 md:h-16 md:w-16">
                <ProjectLogo className="h-full w-full" />
              </div>
            );
          })()
        ) : (
          <div className="relative h-8 w-8 shrink-0 md:h-16 md:w-16">
            <ProjectLogo className="h-full w-full" />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute left-0 top-0 z-30 flex h-12 w-full items-center justify-center md:hidden">
        <span className="origin-center scale-90 transform whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] text-[#060E9F] opacity-90 dark:text-blue-400">
          Dream Lab
        </span>
      </div>

      <div className="absolute right-2 top-2 z-20 flex items-center gap-2 md:right-4 md:top-4">
        {onOpenHome ? (
          <button
            onClick={onOpenHome}
            aria-label="关闭并返回首页"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#060E9F]/12 bg-white text-[#060E9F] shadow-sm transition hover:bg-[#F8F9FA] dark:border-[#333333] dark:bg-[#1E1E1E] dark:text-blue-400 dark:hover:bg-[#0F0F0F] md:h-10 md:w-10"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        ) : null}

        {isSuperAdmin ? (
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="hidden h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition-colors hover:text-[#060E9F] dark:bg-[#1E1E1E] dark:text-dark-text-secondary dark:hover:text-blue-400 md:flex"
            title={showDebugInfo ? "Hide Thinking Process" : "Show Thinking Process"}
          >
            {showDebugInfo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        ) : null}

        <div className="relative">
          <UserMenu />
          {isSuperAdmin ? (
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="absolute -bottom-8 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 shadow-sm dark:border-[#333333] dark:bg-[#1E1E1E] dark:text-dark-text-secondary md:hidden"
              title={showDebugInfo ? "Hide Thinking Process" : "Show Thinking Process"}
            >
              {showDebugInfo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
