"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Moon, Sun, Monitor, BrainCircuit, HeartHandshake, CheckCircle2, Globe, Type, User } from 'lucide-react';
import { usePreferences } from '@/context/preferences-context';
import { useLanguage } from '@/context/language-context';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, fontSize, setFontSize, partnerStyle, setPartnerStyle } = usePreferences();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-[440px] max-w-[95vw] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-[#202124] dark:text-white">{t('settings')}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 overflow-y-auto">

          {/* Language Selection */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
               <Globe className="w-5 h-5 text-gray-400 stroke-[1]" />
               <h3 className="text-xs font-semibold text-[#202124] dark:text-gray-100 uppercase tracking-wider">{t('language')}</h3>
            </div>
            <div className="flex p-1 bg-[#F1F3F4] dark:bg-gray-700 rounded-full">
              <button
                onClick={() => setLanguage('zh')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-all ${
                  language === 'zh' 
                    ? 'bg-white text-[#1A73E8] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-all ${
                  language === 'en' 
                    ? 'bg-white text-[#1A73E8] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                English
              </button>
            </div>
          </section>
          
          {/* A. Appearance */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
               <Monitor className="w-5 h-5 text-gray-400 stroke-[1]" />
               <h3 className="text-xs font-semibold text-[#202124] dark:text-gray-100 uppercase tracking-wider">{t('appearance')}</h3>
            </div>
            <div className="flex p-1 bg-[#F1F3F4] dark:bg-gray-700 rounded-full">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-all ${
                  theme === 'light' 
                    ? 'bg-white text-[#1A73E8] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                {t('light')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-all ${
                  theme === 'dark' 
                    ? 'bg-white text-[#1A73E8] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                {t('dark')}
              </button>
              <button
                onClick={() => setTheme('auto')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-full transition-all ${
                  theme === 'auto' 
                    ? 'bg-white text-[#1A73E8] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                {t('auto')}
              </button>
            </div>
          </section>

          {/* B. Typography */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Type className="w-5 h-5 text-gray-400 stroke-[1]" />
                <h3 className="text-xs font-semibold text-[#202124] dark:text-gray-100 uppercase tracking-wider">{t('typography')}</h3>
              </div>
              <span className="text-[10px] text-[#70757A] dark:text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-md">
                {fontSize === 'default' ? t('standard') : fontSize === 'medium' ? t('medium') : t('large')}
              </span>
            </div>
            
            {/* Custom Segmented Control for Font Size */}
            <div className="relative pt-4 pb-1 px-4">
               {/* Track line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#F1F3F4] dark:bg-gray-700 rounded-full -translate-y-1/2 mx-6" />
              
              <div className="relative flex justify-between">
                {/* Option 1: Default */}
                <button 
                  onClick={() => setFontSize('default')}
                  className="group relative flex flex-col items-center focus:outline-none"
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 transition-colors shadow-sm ${
                    fontSize === 'default' ? 'bg-[#1A73E8] border-[#1A73E8]' : 'bg-white border-gray-300 group-hover:border-[#1A73E8]/50'
                  }`} />
                  <span className={`absolute top-5 text-[10px] font-medium transition-colors ${
                    fontSize === 'default' ? 'text-[#1A73E8]' : 'text-[#70757A]'
                  }`}>Aa</span>
                </button>

                {/* Option 2: Medium */}
                <button 
                  onClick={() => setFontSize('medium')}
                  className="group relative flex flex-col items-center focus:outline-none"
                >
                   <div className={`w-4 h-4 rounded-full border-2 z-10 transition-colors shadow-sm ${
                    fontSize === 'medium' ? 'bg-[#1A73E8] border-[#1A73E8]' : 'bg-white border-gray-300 group-hover:border-[#1A73E8]/50'
                  }`} />
                   <span className={`absolute top-6 text-xs font-medium transition-colors ${
                    fontSize === 'medium' ? 'text-[#1A73E8]' : 'text-[#70757A]'
                  }`}>Aa</span>
                </button>

                {/* Option 3: Large */}
                <button 
                  onClick={() => setFontSize('large')}
                  className="group relative flex flex-col items-center focus:outline-none"
                >
                   <div className={`w-5 h-5 rounded-full border-2 z-10 transition-colors shadow-sm ${
                    fontSize === 'large' ? 'bg-[#1A73E8] border-[#1A73E8]' : 'bg-white border-gray-300 group-hover:border-[#1A73E8]/50'
                  }`} />
                   <span className={`absolute top-7 text-sm font-medium transition-colors ${
                    fontSize === 'large' ? 'text-[#1A73E8]' : 'text-[#70757A]'
                  }`}>Aa</span>
                </button>
              </div>
            </div>
          </section>

          {/* C. Partner Persona */}
          <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
               <User className="w-5 h-5 text-gray-400 stroke-[1]" />
               <h3 className="text-xs font-semibold text-[#202124] dark:text-gray-100 uppercase tracking-wider">{t('partnerPersona')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Rational */}
              <div 
                onClick={() => setPartnerStyle('rational')}
                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group hover:shadow-sm ${
                  partnerStyle === 'rational' 
                    ? 'border-[#1A73E8] bg-[#1A73E8]/5' 
                    : 'border-gray-200 bg-white hover:border-[#1A73E8]/30'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-md ${
                     partnerStyle === 'rational' ? 'bg-[#1A73E8] text-white' : 'bg-gray-100 text-gray-500 group-hover:text-[#1A73E8]'
                  }`}>
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  {partnerStyle === 'rational' && (
                    <CheckCircle2 className="w-4 h-4 text-[#1A73E8]" />
                  )}
                </div>
                <div className="font-medium text-xs text-[#202124] dark:text-white mb-0.5">{t('rationalStyle')}</div>
              </div>

              {/* Option 2: Empathic */}
              <div 
                onClick={() => setPartnerStyle('empathic')}
                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group hover:shadow-sm ${
                  partnerStyle === 'empathic' 
                    ? 'border-[#1A73E8] bg-[#1A73E8]/5' 
                    : 'border-gray-200 bg-white hover:border-[#1A73E8]/30'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                   <div className={`p-1.5 rounded-md ${
                     partnerStyle === 'empathic' ? 'bg-[#1A73E8] text-white' : 'bg-gray-100 text-gray-500 group-hover:text-[#1A73E8]'
                  }`}>
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  {partnerStyle === 'empathic' && (
                    <CheckCircle2 className="w-4 h-4 text-[#1A73E8]" />
                  )}
                </div>
                <div className="font-medium text-xs text-[#202124] dark:text-white mb-0.5">{t('empathicStyle')}</div>
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
