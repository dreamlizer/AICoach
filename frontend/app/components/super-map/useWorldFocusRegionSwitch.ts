"use client";

import { RefObject, useCallback } from "react";
import { WorldFocusRegion } from "./types";
import { WORLD_REGION_CAMERA } from "./world-utils";

type Params = {
  chartRef: RefObject<any>;
  mapScope: "china" | "world";
  setWorldFocusRegion: (value: WorldFocusRegion) => void;
  setMapZoom: (value: number) => void;
  setWorldCenterLng: (value: number) => void;
  setWorldCenterLat: (value: number) => void;
  setMapScope: (value: "china" | "world") => void;
  setShowWorldCoveragePanel: (value: boolean) => void;
  setShowScopeMenu: (value: boolean) => void;
};

export function useWorldFocusRegionSwitch({
  chartRef,
  mapScope,
  setWorldFocusRegion,
  setMapZoom,
  setWorldCenterLng,
  setWorldCenterLat,
  setMapScope,
  setShowWorldCoveragePanel,
  setShowScopeMenu
}: Params) {
  return useCallback((region: WorldFocusRegion) => {
    setWorldFocusRegion(region);
    const camera = WORLD_REGION_CAMERA[region] || WORLD_REGION_CAMERA.ALL;
    setMapZoom(camera.zoom);
    setWorldCenterLng(camera.center[0]);
    setWorldCenterLat(camera.center[1]);
    if (chartRef.current) {
      chartRef.current.setOption({
        series: [{ zoom: camera.zoom, center: camera.center }]
      });
    }
    if (mapScope !== "world") {
      setMapScope("world");
    }
    setShowWorldCoveragePanel(true);
    setShowScopeMenu(false);
  }, [
    chartRef,
    mapScope,
    setMapScope,
    setMapZoom,
    setShowScopeMenu,
    setShowWorldCoveragePanel,
    setWorldCenterLat,
    setWorldCenterLng,
    setWorldFocusRegion
  ]);
}
