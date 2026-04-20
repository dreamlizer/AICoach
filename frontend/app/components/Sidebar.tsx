import { useState, useEffect, useRef } from "react";
import { HistoryItem } from "@/lib/types";
import {
  MoreHorizontal,
  Pin,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Settings,
  Menu,
  Search,
} from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import { ExecutiveTools } from "./ExecutiveTools";
import { toolIconMap } from "@/app/components/Icons";
import { useLanguage } from "@/context/language-context";
import { formatDateTime } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

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
  onOpenAssessment: () => void;
};

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
  onSearchClick,
  onOpenAssessment,
}: SidebarProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalHistory(history || []);
  }, [history]);

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
    setLocalHistory((prev) => prev.filter((item) => item.id !== id));
    setOpenMenuId(null);
    if (activeConversationId === id) {
      onNewChat();
    }

    try {
      await apiClient.history.delete(id);
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
    setOpenMenuId(null);
  };

  const handleSaveRename = async () => {
    if (!editingId) return;

    setLocalHistory((prev) =>
      prev.map((item) => (item.id === editingId ? { ...item, title: editTitle } : item))
    );

    try {
      const item = localHistory.find((entry) => entry.id === editingId);
      await apiClient.conversations.create(editingId, editTitle, item?.tool_id || undefined);
    } catch (err) {
      console.error("Failed to rename history item", err);
    }

    setEditingId(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSaveRename();
    } else if (event.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm md:hidden" onClick={onClose} />
      ) : null}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex h-full w-[70vw] shrink-0 flex-col border-r border-[#F1F3F4] bg-[#F8F9FA] px-3 py-4 font-sans transition-all duration-300 ease-in-out dark:border-[#333333] dark:bg-[#0F0F0F] md:static md:w-[338px] md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl md:shadow-none md:ml-0" : "-translate-x-full md:-ml-[338px]"
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-1">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 dark:text-dark-text-secondary dark:hover:bg-dark-card"
            aria-label="close sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={onSearchClick}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-dark-text-secondary dark:hover:bg-dark-card"
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
          className="mx-1 mb-2 flex w-full items-center justify-start gap-3 rounded-full border border-[#060E9F]/20 bg-white px-4 py-2.5 text-[#060E9F] shadow-sm transition-all hover:bg-[#060E9F]/5 hover:shadow-md dark:border-[#333333] dark:bg-[#1E1E1E] dark:text-blue-400 dark:hover:bg-[#2C2C2C]"
        >
          <Pencil className="h-4 w-4" />
          <span className="text-sm font-semibold">{t("newChat")}</span>
        </button>

        <ExecutiveTools
          onOpenLibrary={() => {
            onOpenToolLibrary();
            if (window.innerWidth < 768) onClose();
          }}
          onAssessmentClick={() => {
            onOpenAssessment();
            if (window.innerWidth < 768) onClose();
          }}
          onSuperMapClick={() => {
            onToolClick("super-map");
            if (window.innerWidth < 768) onClose();
          }}
        />

        <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-1 no-scrollbar">
          <div className="sticky top-0 z-10 bg-[#F8F9FA] px-2 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-[#0F0F0F] dark:text-gray-200">
            {user ? t("recentChats") : t("exampleChats")}
          </div>

          {historyLoading ? (
            <div className="animate-pulse px-3 py-2 text-sm text-gray-400">{t("loading")}</div>
          ) : (
            localHistory.map((item) => {
              const isActive = activeConversationId === item.id;
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-[0.8125rem] transition-all duration-200 ${
                    isActive
                      ? "bg-[#060E9F]/5 font-bold text-[#060E9F] dark:bg-blue-500/10 dark:text-blue-400"
                      : "font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-card"
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
                      onChange={(event) => setEditTitle(event.target.value)}
                      onBlur={handleSaveRename}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="flex-1 rounded border border-blue-300 bg-white px-1 py-0.5 text-sm focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-dark-text-primary"
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <span className="flex flex-1 items-center gap-2 truncate pr-6">
                      {item.tool_id && toolIconMap[item.tool_id] ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#060E9F]/10 text-[#060E9F] dark:text-blue-400">
                          {(() => {
                            const Icon = toolIconMap[item.tool_id];
                            return <Icon className="h-3.5 w-3.5" />;
                          })()}
                        </span>
                      ) : null}
                      <span className="truncate">{item.title}</span>
                    </span>
                  )}

                  {!isEditing ? (
                    <div
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-opacity hover:bg-gray-200 dark:hover:bg-dark-card ${
                        openMenuId === item.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId(openMenuId === item.id ? null : item.id);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-dark-text-muted" />
                    </div>
                  ) : null}

                  {openMenuId === item.id && !isEditing ? (
                    <div
                      ref={menuRef}
                      className="animate-in fade-in zoom-in-95 absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-xl duration-100 dark:border-dark-border dark:bg-dark-card"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <Pin className="h-3 w-3" /> {t("pin")}
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
                        onClick={() => handleStartRename(item.id, item.title)}
                      >
                        <Pencil className="h-3 w-3" /> {t("rename")}
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3 w-3" /> {t("delete")}
                      </button>

                      <div className="mt-1 space-y-1.5 border-t border-gray-100 px-3 pb-2 pt-2 dark:border-dark-border">
                        <div
                          className="flex items-center gap-2 rounded-md bg-[#060E9F]/5 px-2 py-1.5 text-[#060E9F] dark:bg-blue-900/20 dark:text-blue-300"
                          title={t("createdTime")}
                        >
                          <Calendar className="h-3.5 w-3.5 opacity-80" />
                          <span className="text-[0.625rem] font-medium tracking-tight">
                            {formatDateTime(item.created_at, language)}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-2 rounded-md bg-[#FFBF3F]/15 px-2 py-1.5 text-[#B45309] dark:bg-amber-900/20 dark:text-amber-400"
                          title={t("updatedTime")}
                        >
                          <Clock className="h-3.5 w-3.5 opacity-80" />
                          <span className="text-[0.625rem] font-medium tracking-tight">
                            {item.updated_at ? formatDateTime(item.updated_at, language) : t("justNow")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-auto space-y-1 border-t border-gray-100 px-1 pt-4 dark:border-[#333333]">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-[#2C2C2C]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-[#2C2C2C] dark:text-white">
              <Settings className="h-4 w-4" />
            </div>
            <div className="text-sm font-medium">{t("settings")}</div>
          </button>
        </div>
      </aside>
    </>
  );
}
