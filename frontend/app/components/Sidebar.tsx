import { useState, useEffect, useRef } from "react";
import type { ElementType } from "react";
import { HistoryItem } from "@/lib/types";
import { MoreHorizontal, Pin, Pencil, Trash2, Calendar, Clock, Settings, Menu, Search } from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import { ExecutiveTools } from "./ExecutiveTools";
import { executiveTools } from "@/lib/executive_tools";
import { toolIconMap } from "@/app/components/Icons";
import { useLanguage } from "@/context/language-context";
import { formatDateTime } from "@/lib/utils";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  historyLoading: boolean;
  onHistoryClick: (item: HistoryItem) => void;
  onNewChat: () => void;
  onOpenToolLibrary: () => void;
  onToolClick: (toolId: string) => void;
  activeConversationId: string | null;
  onSearchClick: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  history,
  historyLoading,
  onHistoryClick,
  onNewChat,
  onOpenToolLibrary,
  onToolClick,
  activeConversationId,
  onSearchClick
}: SidebarProps) {
  const { t, language } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Local state for history management (Rename/Delete)
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize local history from props
  useEffect(() => {
    setLocalHistory(history || []);
  }, [history]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDelete = async (id: string) => {
    // Optimistic update
    setLocalHistory(prev => prev.filter(item => item.id !== id));
    setOpenMenuId(null);
    if (activeConversationId === id) {
      // Don't modify parent state from here, just let it persist until deleted on server or parent update
    }

    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
    setOpenMenuId(null);
  };

  const handleSaveRename = () => {
    if (editingId) {
      setLocalHistory(prev => prev.map(item => 
        item.id === editingId ? { ...item, title: editTitle } : item
      ));
      setEditingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {/* Sidebar Container */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-[60] flex h-full w-[260px] shrink-0 flex-col 
          border-r border-gray-200 bg-[#F8F9FA] dark:bg-gray-900 dark:border-gray-800 
          px-3 py-4 transition-all duration-300 ease-in-out font-sans 
          md:static md:translate-x-0 
          ${isOpen ? "translate-x-0 shadow-2xl md:shadow-none md:ml-0" : "-translate-x-full md:-ml-[260px]"}
        `}
      >
      {/* Sidebar Header: Toggle + Search */}
      <div className="flex items-center justify-between mb-6 px-1">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          aria-label="close sidebar"
        >
          {/* User requested to keep the hamburger menu icon even when sidebar is open */}
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={onSearchClick}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          aria-label="search"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={() => {
          onNewChat();
          if (window.innerWidth < 768) onClose();
        }}
        className="w-full flex items-center justify-start gap-3 bg-[#060E9F] text-white py-2.5 px-4 rounded-full shadow-sm hover:shadow-md hover:bg-[#060E9F]/90 transition-all mb-2 mx-1"
      >
        <Pencil className="w-4 h-4" />
        <span className="text-sm font-semibold">{t('newChat')}</span>
      </button>

      {/* Executive Thinking Tools Module */}
      <ExecutiveTools 
        tools={executiveTools}
        onOpenLibrary={() => {
          onOpenToolLibrary();
          if (window.innerWidth < 768) onClose();
        }}
        onToolClick={(tool) => {
          onToolClick(tool.id);
          if (window.innerWidth < 768) onClose();
        }}
      />

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-1">
        <div className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-[#F8F9FA] dark:bg-gray-900 z-10">
        {t('recentChats')}
      </div>
        {historyLoading ? (
          <div className="px-3 py-2 text-sm text-gray-400 animate-pulse">
            {t('loading')}
          </div>
        ) : (
          localHistory.map((item) => {
            const isActive = activeConversationId === item.id;
            const isEditing = editingId === item.id;
            
            return (
              <div
                key={item.id}
                className={`group relative flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-[#060E9F]/5 text-[#060E9F] font-medium dark:bg-blue-500/10 dark:text-blue-400' 
                    : 'text-gray-900 font-medium hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
                onClick={() => {
                  if (!isEditing) {
                    onHistoryClick(item);
                    if (window.innerWidth < 768) onClose();
                  }
                }}
              >
                {isEditing ? (
                  <input 
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveRename}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="flex-1 bg-white dark:bg-gray-700 border border-blue-300 rounded px-1 py-0.5 text-sm focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate flex-1 pr-6 flex items-center gap-2">
                    {item.tool_id && toolIconMap[item.tool_id] ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#060E9F]/10 text-[#060E9F]">
                        {(() => {
                          const Icon = toolIconMap[item.tool_id as string];
                          return <Icon className="w-3.5 h-3.5" />;
                        })()}
                      </span>
                    ) : null}
                    <span className="truncate">{item.title}</span>
                  </span>
                )}
                
                {/* Three-dot Menu Trigger */}
                {!isEditing && (
                  <div 
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity ${
                      openMenuId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </div>
                )}

                {/* Dropdown Menu */}
                {openMenuId === item.id && !isEditing && (
                  <div 
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <Pin className="w-3 h-3" /> {t('pin')}
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={() => handleStartRename(item.id, item.title)}
                    >
                      <Pencil className="w-3 h-3" /> {t('rename')}
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3 h-3" /> {t('delete')}
                    </button>
                    
                    {/* Metadata Section */}
                    <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-2 pb-2 px-3 space-y-1.5">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#060E9F]/5 dark:bg-blue-900/20 text-[#060E9F] dark:text-blue-300" title="创建时间">
                         <Calendar className="w-3.5 h-3.5 opacity-80" />
                         <span className="text-[10px] font-medium tracking-tight">
                           {formatDateTime(item.created_at, language)}
                         </span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#FFBF3F]/15 dark:bg-amber-900/20 text-[#B45309] dark:text-amber-400" title="更新时间">
                         <Clock className="w-3.5 h-3.5 opacity-80" />
                         <span className="text-[10px] font-medium tracking-tight">
                           {item.updated_at ? formatDateTime(item.updated_at, language) : '刚刚'}
                         </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto border-t border-gray-100 dark:border-gray-800 pt-4 px-1 space-y-1">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
            <Settings className="w-4 h-4" />
          </div>
          <div className="text-sm font-medium">{t('settings')}</div>
        </button>
      </div>
    </aside>
    </>
  );
}
