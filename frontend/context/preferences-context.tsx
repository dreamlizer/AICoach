'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ModelProvider } from '@/lib/stage_settings';
import { defaultSitePaletteId, getSitePalette, SitePaletteId } from '@/lib/site_palette';

type FontSize = 'default' | 'medium' | 'large';
type PartnerStyle = 'rational' | 'empathetic';

interface PreferencesContextType {
  sitePalette: SitePaletteId;
  setSitePalette: (palette: SitePaletteId) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  partnerStyle: PartnerStyle;
  setPartnerStyle: (style: PartnerStyle) => void;
  modelProvider: ModelProvider;
  setModelProvider: (provider: ModelProvider) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [sitePalette, setSitePaletteState] = useState<SitePaletteId>(defaultSitePaletteId);
  const [fontSize, setFontSize] = useState<FontSize>('default');
  const [partnerStyle, setPartnerStyleState] = useState<PartnerStyle>('empathetic');
  const [modelProvider, setModelProviderState] = useState<ModelProvider>('doubao');

  useEffect(() => {
    const saved = localStorage.getItem("app-model-provider") as ModelProvider;
    if (saved === "deepseek" || saved === "doubao") {
      setModelProviderState(saved);
    }
  }, []);

  useEffect(() => {
    const savedPalette = localStorage.getItem("site-palette") as SitePaletteId | null;
    if (savedPalette) {
      setSitePaletteState(savedPalette);
    }
  }, []);

  const setModelProvider = (provider: ModelProvider) => {
    setModelProviderState(provider);
    localStorage.setItem("app-model-provider", provider);
  };

  const setSitePalette = (palette: SitePaletteId) => {
    setSitePaletteState(palette);
    localStorage.setItem("site-palette", palette);
  };

  const setPartnerStyle = (style: PartnerStyle) => {
    setPartnerStyleState(style);
    const nextProvider = style === "rational" ? "deepseek" : "doubao";
    setModelProviderState(nextProvider);
    localStorage.setItem("app-model-provider", nextProvider);
  };

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

  useEffect(() => {
    const root = window.document.documentElement;
    const palette = getSitePalette(sitePalette);
    Object.entries(palette.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.dataset.sitePalette = palette.id;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = palette.isDark ? 'dark' : 'light';
  }, [sitePalette]);

  return (
    <PreferencesContext.Provider
      value={{
        sitePalette,
        setSitePalette,
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
