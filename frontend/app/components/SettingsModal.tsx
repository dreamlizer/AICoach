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
        className="w-[600px] max-w-[95vw] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('settings')}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">

          {/* Language Selection */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wider">{t('language')}</h3>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => setLanguage('zh')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${
                  language === 'zh' 
                    ? 'bg-white dark:bg-gray-600 text-[#060E9F] dark:text-blue-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${
                  language === 'en' 
                    ? 'bg-white dark:bg-gray-600 text-[#060E9F] dark:text-blue-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                English
              </button>
            </div>
          </section>
          
          {/* A. Appearance */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wider">{t('appearance')}</h3>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${
                  theme === 'light' 
                    ? 'bg-white dark:bg-gray-600 text-[#060E9F] dark:text-blue-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Sun className="w-4 h-4" />
                {t('light')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${
                  theme === 'dark' 
                    ? 'bg-white dark:bg-gray-600 text-[#060E9F] dark:text-blue-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Moon className="w-4 h-4" />
                {t('dark')}
              </button>
              <button
                onClick={() => setTheme('auto')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${
                  theme === 'auto' 
                    ? 'bg-white dark:bg-gray-600 text-[#060E9F] dark:text-blue-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                {t('auto')}
              </button>
            </div>
          </section>

          {/* B. Typography */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">{t('typography')}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {fontSize === 'default' ? t('standard') : fontSize === 'medium' ? t('medium') : t('large')}
              </span>
            </div>
            
            {/* Custom Segmented Control for Font Size */}
            <div className="relative pt-4 pb-1 px-2">
               {/* Track line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700 rounded-full -translate-y-1/2 mx-4" />
              
              <div className="relative flex justify-between">
                {/* Option 1: Default */}
                <button 
                  onClick={() => setFontSize('default')}
                  className="group relative flex flex-col items-center focus:outline-none"
                >
                  <div className={`w-4 h-4 rounded-full border-2 z-10 transition-colors ${
                    fontSize === 'default' ? 'bg-[#060E9F] dark:bg-blue-500 border-[#060E9F] dark:border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-[#060E9F]/50 dark:group-hover:border-blue-500/50'
                  }`} />
                  <span className={`absolute top-5 text-xs font-medium transition-colors ${
                    fontSize === 'default' ? 'text-[#060E9F] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>Aa</span>
                </button>

                {/* Option 2: Medium */}
                <button 
                  onClick={() => setFontSize('medium')}
                  className="group relative flex flex-col items-center focus:outline-none"
                >
                   <div className={`w-5 h-5 rounded-full border-2 z-10 transition-colors ${
                    fontSize === 'medium' ? 'bg-[#060E9F] dark:bg-blue-500 border-[#060E9F] dark:border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-[#060E9F]/50 dark:group-hover:border-blue-500/50'
                  }`} />
                   <span className={`absolute top-6 text-sm font-medium transition-colors ${
                    fontSize === 'medium' ? 'text-[#060E9F] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>Aa</span>
                </button>

                {/* Option 3: Large */}
                <button 
                  onClick={() => setFontSize('large')}
                  className="group relative flex flex-col items-center focus:outline-none"
                >
                   <div className={`w-6 h-6 rounded-full border-2 z-10 transition-colors ${
                    fontSize === 'large' ? 'bg-[#060E9F] dark:bg-blue-500 border-[#060E9F] dark:border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-[#060E9F]/50 dark:group-hover:border-blue-500/50'
                  }`} />
                   <span className={`absolute top-7 text-base font-medium transition-colors ${
                    fontSize === 'large' ? 'text-[#060E9F] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>Aa</span>
                </button>
              </div>
            </div>
          </section>

          {/* C. Partner Persona */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wider">{t('partnerPersona')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Rational */}
              <div 
                onClick={() => setPartnerStyle('rational')}
                className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 group hover:shadow-md ${
                  partnerStyle === 'rational' 
                    ? 'border-[#060E9F] bg-[#060E9F]/5 dark:border-blue-500 dark:bg-blue-500/10' 
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#060E9F]/30 dark:hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${
                     partnerStyle === 'rational' ? 'bg-[#060E9F] dark:bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-[#060E9F]/10 dark:group-hover:bg-blue-500/10 group-hover:text-[#060E9F] dark:group-hover:text-blue-400'
                  }`}>
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  {partnerStyle === 'rational' && (
                    <CheckCircle2 className="w-5 h-5 text-[#060E9F] dark:text-blue-500" />
                  )}
                </div>
                <h4 className={`font-bold mb-1 ${
                  partnerStyle === 'rational' ? 'text-[#060E9F] dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                }`}>{t('rational')}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t('rationalDesc')}
                </p>
              </div>

              {/* Option 2: Empathetic */}
              <div 
                onClick={() => setPartnerStyle('empathetic')}
                className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 group hover:shadow-md ${
                  partnerStyle === 'empathetic' 
                    ? 'border-[#FFBF3F] bg-[#FFBF3F]/5 dark:border-yellow-500 dark:bg-yellow-500/10' 
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#FFBF3F]/50 dark:hover:border-yellow-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${
                     partnerStyle === 'empathetic' ? 'bg-[#FFBF3F] dark:bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-[#FFBF3F]/20 dark:group-hover:bg-yellow-500/20 group-hover:text-[#FFBF3F] dark:group-hover:text-yellow-500'
                  }`}>
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                   {partnerStyle === 'empathetic' && (
                    <CheckCircle2 className="w-5 h-5 text-[#FFBF3F] dark:text-yellow-500" />
                  )}
                </div>
                <h4 className={`font-bold mb-1 ${
                  partnerStyle === 'empathetic' ? 'text-gray-800 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'
                }`}>{t('empathetic')}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t('empatheticDesc')}
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-[#060E9F] dark:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-[#060E9F]/90 dark:hover:bg-blue-500 transition-colors"
           >
             {t('done')}
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
