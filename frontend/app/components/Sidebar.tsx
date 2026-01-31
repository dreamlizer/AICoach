import { useState, useEffect, useRef } from "react";
import { HistoryItem } from "@/lib/types";
import { ChevronRight, MoreHorizontal, Pin, Pencil, Trash2 } from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import { ExecutiveTools } from "./ExecutiveTools";

// 目标 1：恢复数据 (Mock Data)
const MOCK_HISTORY = [
  { id: '1', title: 'Q3 季度战略复盘', date: '2023-10-01' },
  { id: '2', title: '关于裁员的决策咨询', date: '2023-09-28' },
  { id: '3', title: '供应链成本优化', date: '2023-09-25' },
  { id: '4', title: '品牌年轻化重塑提案', date: '2023-09-20' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  historyLoading: boolean;
  onHistoryClick: (title: string, id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  history,
  historyLoading,
  onHistoryClick,
  onNewChat,
}: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>('1'); // Default active for demo
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Local state for history management (Rename/Delete)
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize local history from props or mock
  useEffect(() => {
    if (history && history.length > 0) {
      setLocalHistory(history);
    } else {
      setLocalHistory(MOCK_HISTORY);
    }
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

  const handleDelete = (id: string) => {
    setLocalHistory(prev => prev.filter(item => item.id !== id));
    setOpenMenuId(null);
    if (activeId === id) setActiveId(null);
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

  if (!isOpen) return null;

  return (
    <>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-[#F8F9FA] dark:bg-gray-900 dark:border-gray-800 px-3 py-4 transition-colors duration-200 font-sans">
      {/* Sidebar Header: Toggle + Search */}
      <div className="flex items-center justify-between mb-6 px-1">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          aria-label="close sidebar"
        >
          <span className="text-lg">☰</span>
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          aria-label="search"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.5" y2="16.5" />
          </svg>
        </button>
      </div>

      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-start gap-3 bg-[#060E9F] text-white py-2.5 px-4 rounded-full shadow-sm hover:shadow-md hover:bg-[#060E9F]/90 transition-all mb-2 mx-1"
      >
        <Pencil className="w-4 h-4" />
        <span className="text-sm font-medium">发起新对话</span>
      </button>

      {/* Executive Thinking Tools Module */}
      <ExecutiveTools />

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-1">
        <div className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          近期对话
        </div>
        {historyLoading ? (
          <div className="px-3 py-2 text-sm text-gray-400 animate-pulse">
            加载中...
          </div>
        ) : (
          localHistory.map((item) => {
            const isActive = activeId === item.id;
            const isEditing = editingId === item.id;
            
            return (
              <div
                key={item.id}
                className={`group relative flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-[#060E9F]/5 text-[#060E9F] font-medium dark:bg-blue-500/10 dark:text-blue-400' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                onClick={() => {
                  if (!isEditing) {
                    setActiveId(item.id);
                    onHistoryClick(item.title, item.id);
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
                  <span className="truncate flex-1 pr-6">{item.title}</span>
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
                    className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <Pin className="w-3 h-3" /> 固定
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={() => handleStartRename(item.id, item.title)}
                    >
                      <Pencil className="w-3 h-3" /> 重命名
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3 h-3" /> 删除
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto border-t border-gray-100 dark:border-gray-800 pt-4 px-1">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
            <span className="text-xs">👤</span>
          </div>
          <div className="text-sm font-medium">设置</div>
        </button>
      </div>
    </aside>
    </>
  );
}
