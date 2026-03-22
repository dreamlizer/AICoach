import React from "react";
import { Menu, Hammer, Eye, EyeOff } from "lucide-react";
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
}

export function AppHeader({
  sidebarOpen,
  onSidebarOpen,
  toolsPanelOpen,
  activeToolId,
  isSuperAdmin,
  showDebugInfo,
  setShowDebugInfo,
}: AppHeaderProps) {
  return (
    <>
      {/* Left Side: Toggle & Logo/Icon */}
      <div className="absolute top-2 md:top-4 left-2 md:left-4 z-20 flex items-center">
        {!sidebarOpen && (
          <button
            onClick={onSidebarOpen}
            className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-[#060E9F]/10 dark:border-[#333333] bg-white dark:bg-[#1E1E1E] text-[#060E9F] dark:text-blue-400 shadow-sm hover:bg-gray-50 dark:hover:bg-[#0F0F0F] mr-2"
            aria-label="open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {toolsPanelOpen ? (
          <div className="flex items-center justify-center w-8 h-8 md:w-12 md:h-12 bg-[#060E9F] text-white rounded-lg shadow-sm">
            <Hammer className="w-5 h-5 md:w-7 md:h-7" />
          </div>
        ) : activeToolId ? (
          (() => {
            const tool = getToolById(activeToolId);
            const Icon = tool ? toolIconMap[tool.icon] : null;
            return Icon ? (
              <div className="flex items-center justify-center w-8 h-8 md:w-12 md:h-12 bg-[#060E9F] text-white rounded-lg shadow-sm">
                <Icon className="w-5 h-5 md:w-7 md:h-7" />
              </div>
            ) : (
              <div className="relative w-8 h-8 md:w-16 md:h-16 shrink-0">
                <ProjectLogo className="w-full h-full" />
              </div>
            );
          })()
        ) : (
          <div className="relative w-8 h-8 md:w-16 md:h-16 shrink-0">
            <ProjectLogo className="w-full h-full" />
          </div>
        )}
      </div>

      {/* Center: Mobile Header Title */}
      <div className="absolute top-0 left-0 w-full h-12 flex items-center justify-center pointer-events-none md:hidden z-30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#060E9F] dark:text-blue-400 opacity-90 scale-90 transform origin-center whitespace-nowrap">
          Executive Insider
        </span>
      </div>

      {/* Right Side: Debug & User Menu */}
      <div className="absolute top-2 md:top-4 right-2 md:right-4 z-20 flex items-center gap-2">
        {isSuperAdmin && (
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#1E1E1E] text-gray-500 dark:text-dark-text-secondary shadow-sm hover:text-[#060E9F] dark:hover:text-blue-400 transition-colors"
            title={showDebugInfo ? "Hide Thinking Process" : "Show Thinking Process"}
          >
            {showDebugInfo ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        )}
        <div className="relative">
          <UserMenu />
          {/* Mobile Debug Eye - Below Avatar */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="md:hidden absolute -bottom-8 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#1E1E1E] text-gray-500 dark:text-dark-text-secondary shadow-sm border border-gray-100 dark:border-[#333333]"
              title={showDebugInfo ? "Hide Thinking Process" : "Show Thinking Process"}
            >
              {showDebugInfo ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
