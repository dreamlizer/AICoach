"use client";

import { useCallback, RefObject } from "react";
import { DEFAULT_STATE } from "./constants";
import { MapScope, WorldFocusRegion } from "./types";

type Params = {
  ensureCanEdit: (hint?: string) => boolean;
  mapScope: MapScope;
  worldFocusRegion: WorldFocusRegion;
  worldFocusCamera: { center: [number, number]; zoom: number };
  effectiveMinZoom: number;
  effectiveMaxZoom: number;
  isMobile: boolean;
  chartRef: RefObject<any>;
  setSelectedNames: (value: string[]) => void;
  setLabelLanguage: (value: any) => void;
  setHighlightColor: (value: string) => void;
  setBaseColor: (value: string) => void;
  setBorderColor: (value: string) => void;
  setHoverColor: (value: string) => void;
  setFontColor: (value: string) => void;
  setFontSize: (value: number) => void;
  setFontWeight: (value: number) => void;
  setFontFamily: (value: string) => void;
  setThemeId: (value: string) => void;
  setShowMarineLabels: (value: boolean) => void;
  setMapZoom: (value: number) => void;
  setWorldCenterLng: (value: number) => void;
  setWorldCenterLat: (value: number) => void;
  setActivePanel: (value: string | null) => void;
};

export function useSuperMapResetAction({
  ensureCanEdit,
  mapScope,
  worldFocusRegion,
  worldFocusCamera,
  effectiveMinZoom,
  effectiveMaxZoom,
  isMobile,
  chartRef,
  setSelectedNames,
  setLabelLanguage,
  setHighlightColor,
  setBaseColor,
  setBorderColor,
  setHoverColor,
  setFontColor,
  setFontSize,
  setFontWeight,
  setFontFamily,
  setThemeId,
  setShowMarineLabels,
  setMapZoom,
  setWorldCenterLng,
  setWorldCenterLat,
  setActivePanel
}: Params) {
  return useCallback(() => {
    if (!ensureCanEdit("登录后可重置和编辑地图配置")) return;
    setSelectedNames(DEFAULT_STATE.selectedNames);
    setLabelLanguage(DEFAULT_STATE.labelLanguage);
    setHighlightColor(DEFAULT_STATE.highlightColor);
    setBaseColor(DEFAULT_STATE.baseColor);
    setBorderColor(DEFAULT_STATE.borderColor);
    setHoverColor(DEFAULT_STATE.hoverColor);
    setFontColor(DEFAULT_STATE.fontColor);
    setFontSize(DEFAULT_STATE.fontSize);
    setFontWeight(DEFAULT_STATE.fontWeight);
    setFontFamily(DEFAULT_STATE.fontFamily);
    setThemeId(DEFAULT_STATE.themeId);
    setShowMarineLabels(DEFAULT_STATE.showMarineLabels ?? true);

    if (mapScope === "world") {
      const resetZoom = worldFocusRegion === "ALL" ? 1 : worldFocusCamera.zoom;
      const clampedZoom = Math.max(effectiveMinZoom, Math.min(effectiveMaxZoom, resetZoom));
      setMapZoom(clampedZoom);
      setWorldCenterLng(worldFocusCamera.center[0]);
      setWorldCenterLat(worldFocusCamera.center[1]);
      if (chartRef.current) {
        chartRef.current.setOption({
          series: [{
            zoom: clampedZoom,
            center: worldFocusCamera.center
          }]
        });
      }
    } else {
      setMapZoom(isMobile ? 0.95 : DEFAULT_STATE.mapZoom);
      setWorldCenterLng(0);
      setWorldCenterLat(10);
    }

    setActivePanel(null);
  }, [
    ensureCanEdit,
    mapScope,
    worldFocusRegion,
    worldFocusCamera,
    effectiveMinZoom,
    effectiveMaxZoom,
    isMobile,
    chartRef,
    setSelectedNames,
    setLabelLanguage,
    setHighlightColor,
    setBaseColor,
    setBorderColor,
    setHoverColor,
    setFontColor,
    setFontSize,
    setFontWeight,
    setFontFamily,
    setThemeId,
    setShowMarineLabels,
    setMapZoom,
    setWorldCenterLng,
    setWorldCenterLat,
    setActivePanel
  ]);
}
