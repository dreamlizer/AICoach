"use client";

import { MutableRefObject, useCallback } from "react";
import { MapScope, SearchItem, WorldFocusRegion } from "./types";

type PendingFocus = {
  scope: MapScope;
  center: [number, number];
  zoom: number;
  selectedName: string | null;
};

type UseSuperMapFocusActionsParams = {
  pendingFocusRef: MutableRefObject<PendingFocus | null>;
  setActiveMarineLabelName: (value: string | null) => void;
  setMapScope: (value: MapScope) => void;
  setMapZoom: (value: number) => void;
  setWorldFocusRegion: (value: WorldFocusRegion) => void;
  setWorldCenterLng: (value: number) => void;
  setWorldCenterLat: (value: number) => void;
  setActiveRegionName: (value: string | null) => void;
  setSelectedNames: (value: string[]) => void;
  setShowWorldCoveragePanel: (value: boolean) => void;
  setShowWorldRegionMenu: (value: boolean) => void;
  setShowScopeMenu: (value: boolean) => void;
  setShowSearchPanel: (value: boolean) => void;
};

export function useSuperMapFocusActions({
  pendingFocusRef,
  setActiveMarineLabelName,
  setMapScope,
  setMapZoom,
  setWorldFocusRegion,
  setWorldCenterLng,
  setWorldCenterLat,
  setActiveRegionName,
  setSelectedNames,
  setShowWorldCoveragePanel,
  setShowWorldRegionMenu,
  setShowScopeMenu,
  setShowSearchPanel
}: UseSuperMapFocusActionsParams) {
  const focusChinaRegion = useCallback((name: string, coord: [number, number] | null) => {
    const zoom = 2;
    const center = coord || [104, 36];
    pendingFocusRef.current = { scope: "china", center, zoom, selectedName: name };
    setActiveMarineLabelName(null);
    setMapScope("china");
    setMapZoom(zoom);
    setShowWorldRegionMenu(false);
    setShowScopeMenu(false);
    setShowSearchPanel(false);
  }, [
    pendingFocusRef,
    setActiveMarineLabelName,
    setMapScope,
    setMapZoom,
    setShowSearchPanel,
    setShowScopeMenu,
    setShowWorldRegionMenu
  ]);

  const focusWorldTarget = useCallback((name: string, coord: [number, number] | null, selectedName: string | null) => {
    const zoom = 2;
    const center = coord || [0, 10];
    pendingFocusRef.current = { scope: "world", center, zoom, selectedName };
    setMapScope("world");
    setWorldFocusRegion("ALL");
    setWorldCenterLng(center[0]);
    setWorldCenterLat(center[1]);
    setMapZoom(zoom);
    setActiveRegionName(selectedName ? name : null);
    setSelectedNames(selectedName ? [selectedName] : []);
    setShowWorldCoveragePanel(true);
    setShowWorldRegionMenu(false);
    setShowScopeMenu(false);
    setShowSearchPanel(false);
  }, [
    pendingFocusRef,
    setActiveRegionName,
    setMapScope,
    setMapZoom,
    setSelectedNames,
    setShowSearchPanel,
    setShowScopeMenu,
    setShowWorldCoveragePanel,
    setShowWorldRegionMenu,
    setWorldCenterLat,
    setWorldCenterLng,
    setWorldFocusRegion
  ]);

  const applySearchResult = useCallback((item: SearchItem) => {
    setActiveMarineLabelName(null);
    if (item.targetScope === "china") {
      focusChinaRegion(item.targetName, item.coord);
      return;
    }
    if (item.type === "marine") {
      setActiveMarineLabelName(item.targetName);
      focusWorldTarget(item.targetName, item.coord, null);
      return;
    }
    focusWorldTarget(item.targetName, item.coord, item.targetName);
  }, [focusChinaRegion, focusWorldTarget, setActiveMarineLabelName]);

  return {
    focusChinaRegion,
    focusWorldTarget,
    applySearchResult
  };
}
