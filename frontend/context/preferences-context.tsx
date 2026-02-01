'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('default');
  const [partnerStyle, setPartnerStyle] = useState<PartnerStyle>('rational');

  // Effect for Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Effect for Font Size
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove existing font-size classes if any (assuming we use classes, or inline styles)
    // For now, let's use inline styles on root for immediate feedback and simplicity
    // Default: 100% (16px), Medium: 112.5% (18px), Large: 125% (20px)
    
    switch (fontSize) {
      case 'medium':
        root.style.fontSize = '112.5%';
        break;
      case 'large':
        root.style.fontSize = '125%';
        break;
      case 'default':
      default:
        root.style.fontSize = '100%';
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
