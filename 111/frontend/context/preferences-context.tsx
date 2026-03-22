'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ModelProvider } from '@/lib/stage_settings';

type Theme = 'light' | 'dark' | 'auto';
type FontSize = 'default' | 'medium' | 'large';
type PartnerStyle = 'rational' | 'empathetic';

interface PreferencesContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  partnerStyle: PartnerStyle;
  setPartnerStyle: (style: PartnerStyle) => void;
  modelProvider: ModelProvider;
  setModelProvider: (provider: ModelProvider) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('auto');
  const [fontSize, setFontSize] = useState<FontSize>('default');
  const [partnerStyle, setPartnerStyleState] = useState<PartnerStyle>('empathetic');
  const [modelProvider, setModelProviderState] = useState<ModelProvider>('doubao');

  useEffect(() => {
    const saved = localStorage.getItem("app-model-provider") as ModelProvider;
    if (saved === "deepseek" || saved === "doubao") {
      setModelProviderState(saved);
    }
  }, []);

  const setModelProvider = (provider: ModelProvider) => {
    setModelProviderState(provider);
    localStorage.setItem("app-model-provider", provider);
  };

  const setPartnerStyle = (style: PartnerStyle) => {
    setPartnerStyleState(style);
    const nextProvider = style === "rational" ? "deepseek" : "doubao";
    setModelProviderState(nextProvider);
    localStorage.setItem("app-model-provider", nextProvider);
  };

  // Effect for Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const applySystemTheme = () => {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
        root.style.colorScheme = systemTheme;
      };

      // Apply initially
      applySystemTheme();

      // Listen for changes
      mediaQuery.addEventListener('change', applySystemTheme);
      
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    } else {
      root.classList.add(theme);
      root.style.colorScheme = theme;
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    switch (fontSize) {
      case 'medium':
        root.style.setProperty('--app-font-size', '123.75%');
        break;
      case 'large':
        root.style.setProperty('--app-font-size', '135%');
        break;
      case 'default':
      default:
        root.style.setProperty('--app-font-size', '112.5%');
        break;
    }
  }, [fontSize]);

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        setTheme,
        fontSize,
        setFontSize,
        partnerStyle,
        setPartnerStyle,
        modelProvider,
        setModelProvider,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
