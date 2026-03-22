"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Moon, Sun, Monitor, BrainCircuit, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { usePreferences } from '@/context/preferences-context';
import { useLanguage } from '@/context/language-context';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, fontSize, setFontSize, partnerStyle, setPartnerStyle, modelProvider, setModelProvider } = usePreferences();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const modelIndex = modelProvider === 'deepseek' ? 0 : 1;
  const languageIndex = language === 'zh' ? 0 : 1;
  const themeIndex = theme === 'light' ? 0 : theme === 'dark' ? 1 : 2;
  const fontSizeIndex = fontSize === 'default' ? 0 : fontSize === 'medium' ? 1 : 2;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-[440px] max-w-[95vw] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#333333]">
          <h2 className="text-lg font-bold text-[#202124] dark:text-white">{t('settings')}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">

          <section className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333333] rounded-xl p-3">
            <div className="relative flex p-1 bg-[#F1F3F4] dark:bg-[#121212] rounded-full">
              <div
                className="absolute inset-y-1 left-1 w-1/2 rounded-full bg-white dark:bg-[#2C2C2C] shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${modelIndex * 100}%)` }}
              />
              <button
                onClick={() => setModelProvider('deepseek')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  modelProvider === 'deepseek'
                    ? 'text-[#1A73E8] dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Deepseek
              </button>
              <button
                onClick={() => setModelProvider('doubao')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  modelProvider === 'doubao'
                    ? 'text-[#1A73E8] dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                豆包
              </button>
            </div>
          </section>

          {/* Language Selection */}
          <section className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333333] rounded-xl p-3">
            <div className="relative flex p-1 bg-[#F1F3F4] dark:bg-[#121212] rounded-full">
              <div
                className="absolute inset-y-1 left-1 w-1/2 rounded-full bg-white dark:bg-[#2C2C2C] shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${languageIndex * 100}%)` }}
              />
              <button
                onClick={() => setLanguage('zh')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  language === 'zh' 
                    ? 'text-[#1A73E8] dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  language === 'en' 
                    ? 'text-[#1A73E8] dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                English
              </button>
            </div>
          </section>
          
          {/* A. Appearance */}
          <section className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333333] rounded-xl p-3">
            <div className="relative flex p-1 bg-[#F1F3F4] dark:bg-[#121212] rounded-full">
              <div
                className="absolute inset-y-1 left-1 w-1/3 rounded-full bg-white dark:bg-[#2C2C2C] shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${themeIndex * 100}%)` }}
              />
              <button
                onClick={() => setTheme('light')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  theme === 'light' 
                    ? 'text-[#1A73E8] dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                {t('light')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  theme === 'dark' 
                    ? 'text-[#1A73E8] dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                {t('dark')}
              </button>
              <button
                onClick={() => setTheme('auto')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  theme === 'auto' 
                    ? 'text-[#1A73E8] dark:text-blue-400' 
                    : 'text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                {t('auto')}
              </button>
            </div>
          </section>

          {/* B. Typography */}
          <section className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333333] rounded-xl p-3">
            <div className="relative flex p-1 bg-[#F1F3F4] dark:bg-[#121212] rounded-full">
              <div
                className="absolute inset-y-1 left-1 w-1/3 rounded-full bg-white dark:bg-[#2C2C2C] shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${fontSizeIndex * 100}%)` }}
              />
              <button
                onClick={() => setFontSize('default')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  fontSize === 'default'
                    ? 'text-[#1A73E8] dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t('standard')}
              </button>
              <button
                onClick={() => setFontSize('medium')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  fontSize === 'medium'
                    ? 'text-[#1A73E8] dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t('medium')}
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  fontSize === 'large'
                    ? 'text-[#1A73E8] dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t('large')}
              </button>
            </div>
          </section>

          {/* C. Partner Persona */}
          <section className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333333] rounded-xl p-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Rational */}
              <div 
                onClick={() => setPartnerStyle('rational')}
                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group hover:shadow-sm ${
                  partnerStyle === 'rational' 
                    ? 'border-[#1A73E8] dark:border-blue-400 bg-[#1A73E8]/5 dark:bg-[#1A73E8]/10' 
                    : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1E1E1E] hover:border-[#1A73E8]/30 dark:hover:border-blue-400/30'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-md ${
                     partnerStyle === 'rational' ? 'bg-[#1A73E8] dark:bg-blue-400 text-white' : 'bg-gray-100 dark:bg-[#2C2C2C] text-gray-500 dark:text-gray-400 group-hover:text-[#1A73E8] dark:group-hover:text-blue-400'
                  }`}>
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  {partnerStyle === 'rational' && (
                    <CheckCircle2 className="w-4 h-4 text-[#1A73E8] dark:text-blue-400" />
                  )}
                </div>
                <div className="font-medium text-xs text-[#202124] dark:text-white mb-0.5">{t('rational')}</div>
              </div>

              {/* Option 2: Empathic */}
              <div 
                onClick={() => setPartnerStyle('empathetic')}
                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group hover:shadow-sm ${
                  partnerStyle === 'empathetic' 
                    ? 'border-[#1A73E8] dark:border-blue-400 bg-[#1A73E8]/5 dark:bg-[#1A73E8]/10' 
                    : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1E1E1E] hover:border-[#1A73E8]/30 dark:hover:border-blue-400/30'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-md ${
                     partnerStyle === 'empathetic' ? 'bg-[#1A73E8] dark:bg-blue-400 text-white' : 'bg-gray-100 dark:bg-[#2C2C2C] text-gray-500 dark:text-gray-400 group-hover:text-[#1A73E8] dark:group-hover:text-blue-400'
                  }`}>
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  {partnerStyle === 'empathetic' && (
                    <CheckCircle2 className="w-4 h-4 text-[#1A73E8] dark:text-blue-400" />
                  )}
                </div>
                <div className="font-medium text-xs text-[#202124] dark:text-white mb-0.5">{t('empathetic')}</div>
              </div>
            </div>
          </section>

          {/* Footer - Done Button */}
          <div className="pt-1">
             <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-medium rounded-full shadow-sm transition-all"
            >
              {t('done')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
