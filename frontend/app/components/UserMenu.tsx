"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { User as UserIcon, LogOut, Settings, Edit2, UserCircle, Camera, Lock, History, FileText } from "lucide-react";
import { AuthModal } from "./AuthModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { SettingsModal } from "./SettingsModal";
import { AvatarCropModal } from "./AvatarCropModal";
import { AssessmentHistoryModal } from "./AssessmentHistoryModal";
import { ReleaseNotesModal } from "./ReleaseNotesModal";
import { useLanguage } from "@/context/language-context";
import { latestVersion } from "@/lib/release_notes";
import Image from "next/image";

export function UserMenu() {
  const { user, logout, updateProfile, loading } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [releaseNotesMode, setReleaseNotesMode] = useState<"latest" | "history">("history");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [cropImage, setCropImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingName(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUpdateName = async () => {
    if (newName && newName !== user?.name) {
      await updateProfile({ name: newName });
    }
    setIsEditingName(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t("avatarSizeError"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setCropImage(base64String);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveCrop = async (croppedImage: string) => {
    await updateProfile({ avatar: croppedImage });
    setCropImage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-transparent bg-white/50 p-1 pl-2 pr-1 animate-pulse">
        <div className="h-4 w-16 rounded bg-gray-200" />
        <div className="h-8 w-8 rounded-full bg-gray-200" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 rounded-full border border-[var(--site-border)] bg-[var(--site-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--site-text)] shadow-sm transition-all hover:border-[var(--site-border-strong)] hover:bg-white"
          >
            <Settings className="h-4 w-4" />
            设置
          </button>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[var(--site-accent)] px-4 py-2 text-sm font-medium text-[var(--site-button-text)] shadow-md transition-all hover:bg-[var(--site-accent-strong)]"
          >
            <UserIcon className="h-4 w-4" />
            {t("login")}
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
        {cropImage && (
          <AvatarCropModal
            isOpen={!!cropImage}
            onClose={() => setCropImage(null)}
            imageUrl={cropImage}
            onSave={handleSaveCrop}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsSettingsModalOpen(true)}
        className="flex items-center gap-2 rounded-full border border-[var(--site-border)] bg-[var(--site-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--site-text)] shadow-sm transition-all hover:border-[var(--site-border-strong)] hover:bg-white"
      >
        <Settings className="h-4 w-4" />
        设置
      </button>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center transition-all md:gap-2 md:rounded-full md:border md:border-gray-200 md:bg-white md:p-1 md:pl-2 md:pr-1 md:shadow-sm md:hover:shadow-md dark:md:border-[#333333] dark:md:bg-[#1E1E1E]"
        >
          <span className="hidden max-w-[100px] truncate text-sm font-medium text-gray-700 group-hover:text-[#060E9F] md:block dark:text-gray-200 dark:group-hover:text-blue-400">
            {user.name || user.email.split("@")[0]}
          </span>
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt="Avatar"
              width={32}
              height={32}
              className="rounded-full border border-[#060E9F]/20 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#060E9F]/20 bg-[#060E9F]/10 text-sm font-bold text-[#060E9F]">
              {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-100 bg-white py-2 shadow-xl animate-in fade-in zoom-in-95 duration-200 dark:border-dark-border dark:bg-[#2C2C2C]">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-dark-border">
              <div className="mb-2 flex items-center gap-3">
                <div className="group/avatar relative cursor-pointer" onClick={handleAvatarClick}>
                  {user.avatar ? (
                    <Image src={user.avatar} alt="Avatar" width={40} height={40} className="rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#060E9F]/10 text-lg font-bold text-[#060E9F]">
                      {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm focus:border-[#060E9F] focus:outline-none"
                        autoFocus
                        onBlur={handleUpdateName}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                      />
                    </div>
                  ) : (
                    <div className="group flex items-center justify-between">
                      <p className="truncate font-bold text-gray-900 dark:text-dark-text-primary" title={user.name}>
                        {user.name || t("notSetNickname")}
                      </p>
                      <button
                        onClick={() => {
                          setNewName(user.name || "");
                          setIsEditingName(true);
                        }}
                        className="text-gray-400 opacity-0 transition-opacity hover:text-[#060E9F] group-hover:opacity-100 dark:text-dark-text-muted dark:hover:text-blue-400"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <p className="truncate text-xs text-gray-500 dark:text-dark-text-secondary">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={handleAvatarClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
              >
                <Camera className="h-4 w-4 text-gray-400 dark:text-dark-text-muted" />
                {t("changeAvatar")}
              </button>
              <button
                onClick={() => {
                  setNewName(user.name || "");
                  setIsEditingName(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
              >
                <UserCircle className="h-4 w-4 text-gray-400 dark:text-dark-text-muted" />
                {t("changeUsername")}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
              >
                <Settings className="h-4 w-4 text-gray-400 dark:text-dark-text-muted" />
                站点设置
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
              >
                <Lock className="h-4 w-4 text-gray-400 dark:text-dark-text-muted" />
                修改密码
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsHistoryModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
              >
                <FileText className="h-4 w-4 text-gray-400 dark:text-dark-text-muted" />
                历史测评结果
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setReleaseNotesMode("history");
                  setIsReleaseNotesOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-dark-text-primary dark:hover:bg-[#383838]"
              >
                <History className="h-4 w-4 text-gray-400 dark:text-dark-text-muted" />
                更新历史
              </button>
            </div>

            <div className="mt-1 border-t border-gray-100 pt-1 dark:border-dark-border">
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
            </div>
          </div>
        )}

        <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
        <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
        <AssessmentHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
        <ReleaseNotesModal
          isOpen={isReleaseNotesOpen}
          onClose={() => {
            setIsReleaseNotesOpen(false);
            if (releaseNotesMode === "latest") {
              localStorage.setItem("last_seen_version", latestVersion);
            }
          }}
          mode={releaseNotesMode}
        />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        {cropImage && (
          <AvatarCropModal
            isOpen={!!cropImage}
            onClose={() => setCropImage(null)}
            imageUrl={cropImage}
            onSave={handleSaveCrop}
          />
        )}
      </div>
    </div>
  );
}
