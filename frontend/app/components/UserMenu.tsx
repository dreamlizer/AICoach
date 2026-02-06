"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { User as UserIcon, LogOut, Settings, Edit2, UserCircle, Camera, Lock } from "lucide-react";
import { AuthModal } from "./AuthModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { SettingsModal } from "./SettingsModal";
import { useLanguage } from "@/context/language-context";

export function UserMenu() {
  const { user, logout, updateProfile, loading } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
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

    // Limit size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert(t('avatarSizeError'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await updateProfile({ avatar: base64String });
    };
    reader.readAsDataURL(file);
  };

  // Loading state placeholder
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-1 pl-2 pr-1 rounded-full bg-white/50 border border-transparent animate-pulse">
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 rounded-full bg-gray-200"></div>
      </div>
    );
  }

  // If not logged in, show simple Login button
  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#060E9F] text-white rounded-full shadow-md hover:bg-[#060E9F]/90 transition-all text-sm font-medium"
        >
          <UserIcon className="w-4 h-4" />
          {t('login')}
        </button>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 pr-1 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all group"
      >
        <span className="text-sm font-medium text-gray-700 group-hover:text-[#060E9F] max-w-[100px] truncate">
          {user.name || user.email.split('@')[0]}
        </span>
        {user.avatar ? (
          <img src={user.avatar} alt="Avatar" className="h-8 w-8 rounded-full object-cover border border-[#060E9F]/20" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-[#060E9F]/10 text-[#060E9F] flex items-center justify-center font-bold text-sm border border-[#060E9F]/20">
            {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative group/avatar cursor-pointer" onClick={handleAvatarClick}>
                 {user.avatar ? (
                   <img src={user.avatar} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                 ) : (
                   <div className="h-10 w-10 rounded-full bg-[#060E9F]/10 text-[#060E9F] flex items-center justify-center font-bold text-lg">
                      {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                   </div>
                 )}
                 <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                 </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:border-[#060E9F]"
                      autoFocus
                      onBlur={handleUpdateName}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <p className="font-bold text-gray-900 truncate" title={user.name}>
                      {user.name || t('notSetNickname')}
                    </p>
                    <button 
                      onClick={() => {
                        setNewName(user.name || "");
                        setIsEditingName(true);
                      }}
                      className="text-gray-400 hover:text-[#060E9F] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={handleAvatarClick}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <Camera className="w-4 h-4 text-gray-400" />
              {t('changeAvatar')}
            </button>
             <button
              onClick={() => {
                setNewName(user.name || "");
                setIsEditingName(true);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <UserCircle className="w-4 h-4 text-gray-400" />
              {t('changeUsername')}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsChangePasswordOpen(true);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <Lock className="w-4 h-4 text-gray-400" />
              修改密码
            </button>
          </div>

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>
        </div>
      )}

      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
