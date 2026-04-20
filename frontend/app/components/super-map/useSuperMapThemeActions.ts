"use client";

import { useCallback } from "react";
import { THEME_PRESETS } from "./constants";

type Params = {
  ensureCanEdit: (hint?: string) => boolean;
  setThemeId: (value: string) => void;
  setHighlightColor: (value: string) => void;
  setBaseColor: (value: string) => void;
  setBorderColor: (value: string) => void;
  setHoverColor: (value: string) => void;
};

export function useSuperMapThemeActions({
  ensureCanEdit,
  setThemeId,
  setHighlightColor,
  setBaseColor,
  setBorderColor,
  setHoverColor
}: Params) {
  const applyTheme = useCallback((id: string) => {
    if (!ensureCanEdit("登录后可切换主题与样式")) return;
    const target = THEME_PRESETS.find((item) => item.id === id);
    if (!target) return;
    setThemeId(target.id);
    setHighlightColor(target.highlightColor);
    setBaseColor(target.baseColor);
    setBorderColor(target.borderColor);
    setHoverColor(target.hoverColor);
  }, [ensureCanEdit, setBaseColor, setBorderColor, setHighlightColor, setHoverColor, setThemeId]);

  const applyColor = useCallback((type: "highlight" | "base" | "border" | "hover", color: string) => {
    if (!ensureCanEdit("登录后可自定义颜色与高亮")) return;
    setThemeId("custom");
    if (type === "highlight") setHighlightColor(color);
    if (type === "base") setBaseColor(color);
    if (type === "border") setBorderColor(color);
    if (type === "hover") setHoverColor(color);
  }, [ensureCanEdit, setBaseColor, setBorderColor, setHighlightColor, setHoverColor, setThemeId]);

  return {
    applyTheme,
    applyColor
  };
}
