"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Download, Languages, ListPlus, Paintbrush, Search, Trash2, X } from "lucide-react";
import { DEFAULT_STATE, THEME_PRESETS, COLOR_SWATCHES, FONT_FAMILIES, FONT_COLOR_SWATCHES, MIN_MAP_ZOOM, MAX_MAP_ZOOM, REGION_EN_MAP, PROVINCE_INFO, WORLD_LABEL_PRIORITY, WORLD_DATA_SOURCE_TEXT, buildMapGeoJson, buildWorldGeoJson, getLocalizedWorldCapital, getWorldCountryCanonicalName, getWorldCountryIdByName, getWorldCountryProfile, getWorldCountryZhName, getWorldPointTimeInfo, loadChinaGeoJsonRemote, loadWorldGeoJsonRemote } from "./super-map/constants";
import { loadEchartsGlobal as loadSharedEchartsGlobal } from "./super-map/echarts-loader";
import { downloadChartImage } from "./super-map/download-chart-image";
import { LabelLanguage, MapScope, PersistedState, MarineLabel, SearchItem, WorldFocusRegion, WorldRuntimeMeta } from "./super-map/types";
import { WORLD_COVERAGE_REGIONS, WORLD_FOCUS_REGIONS } from "./super-map/world-region-options";
import { useSuperMapFocusActions } from "./super-map/useSuperMapFocusActions";
import { useSuperMapResetAction } from "./super-map/useSuperMapResetAction";
import { useSuperMapThemeActions } from "./super-map/useSuperMapThemeActions";
import { useWorldFocusRegionSwitch } from "./super-map/useWorldFocusRegionSwitch";
import { useWorldCoverageStats } from "./super-map/useWorldCoverageStats";
import { useWorldMapData } from "./super-map/useWorldMapData";
import { ZoomControl } from "./super-map/ZoomControl";
import { ProvinceInfoCard } from "./super-map/ProvinceInfoCard";
import { computeWorldFocusCamera, getFeatureAnchor, getWorldFeaturesByRegion, hexToRgba as toRgba, normalizeName as normalizeWorldName, WORLD_REGION_CAMERA } from "./super-map/world-utils";
import { buildChinaBatchAliasMap, buildWorldBatchAliasMap, createScopeHint, createScopeSummaryTitle, parseBatchTokens, resolveBatchSelection } from "./super-map/batch-select";

type SuperMapModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | number;
  onReady?: () => void;
};

const WHEEL_ZOOM_STEP = 1.02;
const WHEEL_ZOOM_THROTTLE_MS = 32;
const MOBILE_ROAM_LABEL_RESTORE_MS = 180;
type SearchItemType = SearchItem["type"];

function formatPopulationByLang(value: number, language: LabelLanguage) {
  if (language === "en") return `${Math.round(value).toLocaleString()}`;
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${Math.round(value / 10000)}万`;
  return `${Math.round(value)}`;
}

function formatAreaByLang(value: number, language: LabelLanguage) {
  if (language === "en") return `${Math.round(value).toLocaleString()} km²`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万 km²`;
  return `${Math.round(value)} km²`;
}

const MARINE_LABELS: MarineLabel[] = [
  { name: "太平洋", coord: [165, 8], kind: "ocean", scopes: ["ALL", "Asia", "Oceania"], maxZoom: 3.3 },
  { name: "太平洋", coord: [-145, 6], kind: "ocean", scopes: ["ALL", "NorthAmerica", "SouthAmerica"], maxZoom: 3.3 },
  { name: "大西洋", coord: [-35, 12], kind: "ocean", scopes: ["ALL", "Europe", "Africa", "NorthAmerica", "SouthAmerica"], maxZoom: 3.5 },
  { name: "印度洋", coord: [82, -18], kind: "ocean", scopes: ["ALL", "Asia", "Africa", "Oceania"], maxZoom: 3.5 },
  { name: "北冰洋", coord: [20, 74], kind: "ocean", scopes: ["ALL", "Europe", "NorthAmerica", "Asia"], minZoom: 0.7, maxZoom: 4.2 },
  { name: "英吉利海峡", coord: [-1.25, 50.4], kind: "strait", scopes: ["ALL", "Europe"], minZoom: 1, rotation: 0.08 },
  { name: "马六甲海峡", coord: [100.95, 3.0], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1, rotation: -0.95 },
  { name: "霍尔木兹海峡", coord: [56.35, 26.3], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.1, rotation: -0.35 },
  { name: "曼德海峡", coord: [43.3, 12.6], kind: "strait", scopes: ["ALL", "Africa", "Asia"], minZoom: 1.1 },
  { name: "直布罗陀海峡", coord: [-5.75, 35.9], kind: "strait", scopes: ["ALL", "Europe", "Africa"], minZoom: 1, rotation: -0.1 },
  { name: "博斯普鲁斯海峡", coord: [29.05, 41.15], kind: "strait", scopes: ["ALL", "Europe", "Asia"], minZoom: 1.2 },
  { name: "达达尼尔海峡", coord: [26.4, 40.2], kind: "strait", scopes: ["ALL", "Europe", "Asia"], minZoom: 1.2 },
  { name: "白令海峡", coord: [-168.7, 65.7], kind: "strait", scopes: ["ALL", "NorthAmerica", "Asia"], minZoom: 1.1 },
  { name: "台湾海峡", coord: [119.9, 24.55], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.3, rotation: 1.02 },
  { name: "朝鲜海峡", coord: [128.9, 34.5], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.3, rotation: -0.28 },
  { name: "巽他海峡", coord: [105.9, -5.9], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.3 },
  { name: "巴士海峡", coord: [121.1, 21.25], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.3, rotation: -1.02 },
  { name: "佛罗里达海峡", coord: [-80.2, 24.4], kind: "strait", scopes: ["ALL", "NorthAmerica"], minZoom: 1.3 },
  { name: "德雷克海峡", coord: [-65.5, -56.4], kind: "strait", scopes: ["ALL", "SouthAmerica"], minZoom: 1.2 },
  { name: "莫桑比克海峡", coord: [43.5, -17.8], kind: "strait", scopes: ["ALL", "Africa"], minZoom: 1.2 },
  { name: "卡特加特海峡", coord: [11.3, 57.4], kind: "strait", scopes: ["ALL", "Europe"], minZoom: 1.2 },
  { name: "斯卡格拉克海峡", coord: [9.2, 58.8], kind: "strait", scopes: ["ALL", "Europe"], minZoom: 1.2 },
  { name: "宗谷海峡", coord: [142.1, 45.7], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.3, rotation: -0.18 },
  { name: "对马海峡", coord: [130.2, 33.5], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.3, rotation: -0.62 },
  { name: "龙目海峡", coord: [116.0, -8.6], kind: "strait", scopes: ["ALL", "Asia"], minZoom: 1.3 },
  { name: "戴维斯海峡", coord: [-60.5, 67.3], kind: "strait", scopes: ["ALL", "NorthAmerica"], minZoom: 1.3 },
  { name: "麦哲伦海峡", coord: [-71.4, -53.1], kind: "strait", scopes: ["ALL", "SouthAmerica"], minZoom: 1.2 }
];

export function SuperMapModal({ isOpen, onClose, userId, onReady }: SuperMapModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [labelLanguage, setLabelLanguage] = useState<LabelLanguage>("zh");
  const [highlightColor, setHighlightColor] = useState("#F59E0B");
  const [baseColor, setBaseColor] = useState("#C7CCD4");
  const [borderColor, setBorderColor] = useState("#FFFFFF");
  const [hoverColor, setHoverColor] = useState("#FDBA74");
  const [fontColor, setFontColor] = useState(DEFAULT_STATE.fontColor);
  const [fontSize, setFontSize] = useState(11);
  const [fontWeight, setFontWeight] = useState(600);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [themeId, setThemeId] = useState(DEFAULT_STATE.themeId);
  const [mapZoom, setMapZoom] = useState(DEFAULT_STATE.mapZoom);
  const [mapScope, setMapScope] = useState<MapScope>("china");
  const [worldCenterLng, setWorldCenterLng] = useState(0);
  const [worldCenterLat, setWorldCenterLat] = useState(20);
  const [activeRegionName, setActiveRegionName] = useState<string | null>(null);
  const [hoverCoord, setHoverCoord] = useState<[number, number] | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const [showWorldRegionMenu, setShowWorldRegionMenu] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [batchAppendMode, setBatchAppendMode] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    scope: MapScope;
    matched: string[];
    missing: string[];
    mode: "replace" | "append";
    totalSelected: number;
  } | null>(null);
  const [activeMarineLabelName, setActiveMarineLabelName] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isWeChatBrowser, setIsWeChatBrowser] = useState(false);
  const [mobileRoaming, setMobileRoaming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingChinaGeo, setLoadingChinaGeo] = useState(true);
  const [loadingWorldGeo, setLoadingWorldGeo] = useState(true);
  const [loadingMapEngine, setLoadingMapEngine] = useState(false);
  const [timeTick, setTimeTick] = useState(Date.now());
  const [worldCoverageRegion, setWorldCoverageRegion] = useState("ALL");
  const [worldFocusRegion, setWorldFocusRegion] = useState<WorldFocusRegion>("ALL");
  const [showMarineLabels, setShowMarineLabels] = useState(DEFAULT_STATE.showMarineLabels ?? true);
  const [showWorldCoveragePanel, setShowWorldCoveragePanel] = useState(false);
  const [chartVersion, setChartVersion] = useState(0);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const worldCoveragePanelRef = useRef<HTMLDivElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const batchPanelRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusRef = useRef<{ scope: MapScope; center: [number, number]; zoom: number; selectedName: string | null } | null>(null);
  const lastWheelZoomAtRef = useRef(0);
  const mobileRoamEndTimerRef = useRef<number | null>(null);
  const hasReportedReadyRef = useRef(false);
  const { worldGdpByName, worldMetaByName, worldMetaByIso } = useWorldMapData({ isOpen, mapScope });

  const storageKey = useMemo(() => `super_map_state_${userId || "guest"}_${mapScope}`, [userId, mapScope]);
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const [mapGeoJson, setMapGeoJson] = useState<any>(() => buildMapGeoJson());
  const [worldGeoJson, setWorldGeoJson] = useState<any>(() => buildWorldGeoJson());
  const chinaReady = Array.isArray(mapGeoJson?.features) && mapGeoJson.features.length > 0;
  const activeWorldGeoJson = useMemo(() => {
    const features = getWorldFeaturesByRegion(worldFocusRegion, worldGeoJson, worldMetaByName);
    return {
      ...worldGeoJson,
      features
    };
  }, [worldGeoJson, worldFocusRegion, worldMetaByName]);
  const activeWorldReady = Array.isArray(activeWorldGeoJson?.features) && activeWorldGeoJson.features.length > 0;
  const activeWorldMapName = useMemo(() => `world-super-map-${worldFocusRegion}`, [worldFocusRegion]);
  const effectiveMinZoom = mapScope === "world" && worldFocusRegion !== "ALL" ? 1 : MIN_MAP_ZOOM;
  const effectiveMaxZoom = mapScope === "world" && worldFocusRegion !== "ALL" ? 7 : MAX_MAP_ZOOM;
  const worldFocusCamera = useMemo(() => {
    const fallback = WORLD_REGION_CAMERA[worldFocusRegion] || WORLD_REGION_CAMERA.ALL;
    const features = Array.isArray(activeWorldGeoJson?.features) ? activeWorldGeoJson.features : [];
    return computeWorldFocusCamera(features, fallback, effectiveMinZoom, effectiveMaxZoom);
  }, [activeWorldGeoJson, worldFocusRegion, effectiveMinZoom, effectiveMaxZoom]);
  const marineLabelData = useMemo(() => {
    if (!showMarineLabels || mapScope !== "world") return [];
    return MARINE_LABELS.filter((label) => {
      const inScope = worldFocusRegion === "ALL" ? true : label.scopes.includes(worldFocusRegion);
      if (!inScope) return false;
      if (typeof label.minZoom === "number" && mapZoom < label.minZoom) return false;
      if (typeof label.maxZoom === "number" && mapZoom > label.maxZoom) return false;
      if (isMobile) {
        if (label.kind === "ocean") {
          if (worldFocusRegion !== "ALL") return false;
          if (mapZoom > 2.2) return false;
        }
        if (label.kind === "strait") {
          const highlighted = activeMarineLabelName === label.name;
          if (!highlighted && mapZoom < 4.2) return false;
        }
      }
      return true;
    }).map((label) => ({
      name: label.name,
      coord: label.coord,
      value: label.kind,
      labelName: label.name,
      rotation: label.rotation || 0
    }));
  }, [showMarineLabels, mapScope, worldFocusRegion, mapZoom, isMobile, activeMarineLabelName]);
  const resourceLoadingMessage = useMemo(() => {
    if (!isOpen) return null;
    if (loadingMapEngine) return "地图引擎加载中，请稍候…";
    if (mapScope === "china" && (loadingChinaGeo || !chinaReady)) return "中国地图加载中，请稍候…";
    if (mapScope === "world" && (loadingWorldGeo || !activeWorldReady)) return "世界地图加载中，请稍候…";
    return null;
  }, [isOpen, loadingMapEngine, mapScope, loadingChinaGeo, chinaReady, loadingWorldGeo, activeWorldReady]);

  useEffect(() => {
    if (!isOpen) {
      hasReportedReadyRef.current = false;
      return;
    }
    if (resourceLoadingMessage) return;
    if (hasReportedReadyRef.current) return;
    hasReportedReadyRef.current = true;
    onReady?.();
  }, [isOpen, resourceLoadingMessage, onReady]);
  const marineSearchItems = useMemo<SearchItem[]>(
    () =>
      MARINE_LABELS.map((item) => ({
        key: `marine_${item.name}_${item.coord[0]}_${item.coord[1]}`,
        label: item.name,
        type: "marine",
        targetName: item.name,
        targetScope: "world",
        coord: item.coord
      })),
    []
  );
  const searchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    Object.keys(PROVINCE_INFO).forEach((name) => {
      const feature = Array.isArray(mapGeoJson?.features)
        ? mapGeoJson.features.find((item: any) => String(item?.properties?.name || "") === name)
        : null;
      items.push({
        key: `china_${name}`,
        label: name,
        type: "china_region",
        targetName: name,
        targetScope: "china",
        coord: feature ? getFeatureAnchor(feature) : null
      });
    });
    const worldFeatures = Array.isArray(worldGeoJson?.features) ? worldGeoJson.features : [];
    const worldByCanonical: Record<string, { rawName: string; canonicalName: string; coord: [number, number] | null }> = {};
    worldFeatures.forEach((feature: any) => {
      const rawName = String(feature?.properties?.name || "");
      const canonical = getWorldCountryCanonicalName(rawName);
      const normalizedKey = normalizeWorldName(canonical);
      if (worldByCanonical[normalizedKey]) return;
      worldByCanonical[normalizedKey] = { rawName, canonicalName: canonical, coord: getFeatureAnchor(feature) };
    });
    Object.values(worldByCanonical).forEach((item) => {
      const zhName =
        worldMetaByName[normalizeWorldName(item.canonicalName)]?.zhName ||
        getWorldCountryZhName(item.canonicalName) ||
        item.canonicalName;
      items.push({
        key: `world_${item.rawName}`,
        label: zhName,
        type: "world_country",
        targetName: item.rawName,
        targetScope: "world",
        coord: item.coord
      });
      const profile = getWorldCountryProfile(item.canonicalName);
      const capitalEn = worldMetaByName[normalizeWorldName(item.canonicalName)]?.capitalEn || profile.capital;
      const capitalZh = getLocalizedWorldCapital(capitalEn, "zh");
      if (capitalZh && capitalZh !== "待补充") {
        items.push({
          key: `capital_zh_${item.rawName}`,
          label: `${capitalZh}（首都）`,
          type: "world_capital",
          targetName: item.rawName,
          targetScope: "world",
          coord: item.coord
        });
      }
      if (capitalEn && capitalEn !== "待补充") {
        items.push({
          key: `capital_en_${item.rawName}`,
          label: `${capitalEn} (Capital)`,
          type: "world_capital",
          targetName: item.rawName,
          targetScope: "world",
          coord: item.coord
        });
      }
    });
    return [...items, ...marineSearchItems];
  }, [mapGeoJson, worldGeoJson, worldMetaByName, marineSearchItems]);
  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedSearchKeyword || normalizedSearchKeyword.length < 2) return [];
    const matched = searchItems.filter((item) => item.label.toLowerCase().includes(normalizedSearchKeyword));
    const order: Record<SearchItemType, number> = {
      china_region: 0,
      world_country: 1,
      world_capital: 2,
      marine: 3
    };
    return matched
      .sort((a, b) => {
        const oa = order[a.type];
        const ob = order[b.type];
        if (oa !== ob) return oa - ob;
        return a.label.length - b.label.length;
      })
      .slice(0, 10);
  }, [searchItems, normalizedSearchKeyword]);
  const chinaBatchAliasMap = useMemo(
    () => buildChinaBatchAliasMap({ mapGeoJson, regionEnMap: REGION_EN_MAP }),
    [mapGeoJson]
  );
  const worldBatchAliasMap = useMemo(
    () => buildWorldBatchAliasMap({ activeWorldGeoJson, worldMetaByName }),
    [activeWorldGeoJson, worldMetaByName]
  );
  const applyBatchSelection = useCallback(() => {
    const tokens = parseBatchTokens(batchInput);
    const resolver = mapScope === "china" ? chinaBatchAliasMap : worldBatchAliasMap;
    const { matched, missing } = resolveBatchSelection(tokens, resolver);
    const nextSelected = batchAppendMode
      ? Array.from(new Set([...selectedNames, ...matched]))
      : matched;
    setSelectedNames(nextSelected);
    setActiveRegionName(nextSelected.length > 0 ? nextSelected[0] : null);
    setBatchResult({
      scope: mapScope,
      matched,
      missing,
      mode: batchAppendMode ? "append" : "replace",
      totalSelected: nextSelected.length
    });
    setShowBatchPanel(false);
  }, [batchInput, mapScope, chinaBatchAliasMap, worldBatchAliasMap, batchAppendMode, selectedNames]);
  const ensureCanEdit = useCallback((_hint?: string) => true, []);
  const { applyTheme: applyThemeAction, applyColor: applyColorAction } = useSuperMapThemeActions({
    ensureCanEdit,
    setThemeId,
    setHighlightColor,
    setBaseColor,
    setBorderColor,
    setHoverColor
  });
  const resetAllAction = useSuperMapResetAction({
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
  });
  const { focusChinaRegion, focusWorldTarget, applySearchResult } = useSuperMapFocusActions({
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
  });
  const switchMapScope = useCallback((scope: MapScope) => {
    if (scope === "china") {
      setMapScope("china");
      setActiveRegionName(null);
      setSelectedNames([]);
      setWorldCenterLng(0);
      setWorldCenterLat(10);
      setShowScopeMenu(false);
      setShowWorldRegionMenu(false);
      setShowWorldCoveragePanel(false);
      return;
    }
    setMapScope("world");
    setActiveRegionName(null);
    setSelectedNames([]);
    setMapZoom(1);
    setWorldFocusRegion("ALL");
    setWorldCenterLng(0);
    setWorldCenterLat(10);
    setShowScopeMenu(false);
    setShowWorldRegionMenu(false);
    setShowWorldCoveragePanel(true);
  }, []);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || mapScope !== "world" || !showWorldCoveragePanel) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (worldCoveragePanelRef.current?.contains(target)) return;
      setShowWorldCoveragePanel(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isOpen, mapScope, showWorldCoveragePanel]);

  useEffect(() => {
    let cancelled = false;
    const loadGeo = async () => {
      setLoadingChinaGeo(true);
      try {
        const china = await loadChinaGeoJsonRemote();
        if (!cancelled) {
          setMapGeoJson(buildMapGeoJson(china));
        }
      } catch (error: any) {
        if (!cancelled) {
          setNotice(`中国地图数据加载失败：${String(error?.message || "unknown error")}`);
        }
      } finally {
        if (!cancelled) setLoadingChinaGeo(false);
      }
      setLoadingWorldGeo(true);
      try {
        const world = await loadWorldGeoJsonRemote();
        if (!cancelled) {
          setWorldGeoJson(buildWorldGeoJson(world));
        }
      } catch (error: any) {
        if (!cancelled) {
          setNotice(`世界地图数据加载失败：${String(error?.message || "unknown error")}`);
        }
      } finally {
        if (!cancelled) setLoadingWorldGeo(false);
      }
    };
    loadGeo();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const updateDevice = () => setIsMobile(window.innerWidth < 768);
    updateDevice();
    setIsWeChatBrowser(/MicroMessenger/i.test(window.navigator.userAgent || ""));
    window.addEventListener("resize", updateDevice);
    return () => window.removeEventListener("resize", updateDevice);
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      if (mobileRoamEndTimerRef.current) {
        window.clearTimeout(mobileRoamEndTimerRef.current);
        mobileRoamEndTimerRef.current = null;
      }
      setMobileRoaming(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!toolbarRef.current) return;
      if (!toolbarRef.current.contains(event.target as Node)) {
        setActivePanel(null);
      }
      if (searchPanelRef.current && !searchPanelRef.current.contains(event.target as Node)) {
        setShowSearchPanel(false);
      }
      if (batchPanelRef.current && !batchPanelRef.current.contains(event.target as Node)) {
        setShowBatchPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    setShowBatchPanel(false);
    setBatchResult(null);
    setBatchInput("");
    setBatchAppendMode(false);
  }, [isOpen, mapScope]);

  useEffect(() => {
    if (!activeMarineLabelName) return;
    const timer = window.setTimeout(() => {
      setActiveMarineLabelName(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeMarineLabelName]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mapScope !== "world") return;
    const timer = window.setInterval(() => setTimeTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, mapScope]);

  useEffect(() => {
    if (!isOpen) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
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
      setMapZoom(isMobile ? 0.95 : DEFAULT_STATE.mapZoom);
      setShowMarineLabels(DEFAULT_STATE.showMarineLabels ?? true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PersistedState;
      setSelectedNames(parsed.selectedNames || []);
      setLabelLanguage(parsed.labelLanguage || DEFAULT_STATE.labelLanguage);
      setHighlightColor(parsed.highlightColor || DEFAULT_STATE.highlightColor);
      setBaseColor(parsed.baseColor || DEFAULT_STATE.baseColor);
      setBorderColor(parsed.borderColor || DEFAULT_STATE.borderColor);
      setHoverColor(parsed.hoverColor || DEFAULT_STATE.hoverColor);
      setFontColor(parsed.fontColor || DEFAULT_STATE.fontColor);
      setFontSize(parsed.fontSize || DEFAULT_STATE.fontSize);
      setFontWeight(parsed.fontWeight || DEFAULT_STATE.fontWeight);
      setFontFamily(parsed.fontFamily || DEFAULT_STATE.fontFamily);
      setThemeId(parsed.themeId || DEFAULT_STATE.themeId);
      setMapZoom(parsed.mapZoom || (isMobile ? 0.95 : DEFAULT_STATE.mapZoom));
      setShowMarineLabels(parsed.showMarineLabels ?? (DEFAULT_STATE.showMarineLabels ?? true));
    } catch {
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
      setMapZoom(isMobile ? 0.95 : DEFAULT_STATE.mapZoom);
      setShowMarineLabels(DEFAULT_STATE.showMarineLabels ?? true);
    }
  }, [isOpen, storageKey, isMobile]);

  useEffect(() => {
    if (!isOpen || mapScope !== "world" || !activeWorldReady) return;
    if (pendingFocusRef.current?.scope === "world") return;
    setMapZoom(worldFocusCamera.zoom);
    setWorldCenterLng(worldFocusCamera.center[0]);
    setWorldCenterLat(worldFocusCamera.center[1]);
    if (chartRef.current) {
      chartRef.current.setOption({
        series: [{
          zoom: worldFocusCamera.zoom,
          center: worldFocusCamera.center
        }]
      });
    }
  }, [isOpen, mapScope, worldFocusRegion, worldFocusCamera, activeWorldReady]);

  useEffect(() => {
    if (!chartRef.current) return;
    const pending = pendingFocusRef.current;
    if (!pending || pending.scope !== mapScope) return;
    chartRef.current.setOption({
      series: [{ center: pending.center, zoom: pending.zoom }]
    });
    if (pending.selectedName) {
      setActiveRegionName(pending.selectedName);
      setSelectedNames([pending.selectedName]);
    } else {
      setActiveRegionName(null);
      setSelectedNames([]);
    }
    pendingFocusRef.current = null;
  }, [chartVersion, mapScope, activeWorldMapName, worldCenterLng, worldCenterLat, mapZoom]);

  useEffect(() => {
    if (!isOpen || !chartHostRef.current) return;
    if (mapScope === "china" && !chinaReady) return;
    if (mapScope === "world" && !activeWorldReady) return;
    let disposed = false;
    let chart: any = null;
    let zr: any = null;
    const bootstrap = async () => {
      let echarts: any = null;
      if (!disposed) setLoadingMapEngine(true);
      try {
        echarts = await loadSharedEchartsGlobal();
      } catch (error: any) {
        if (!disposed) setLoadingMapEngine(false);
        if (!disposed) {
          const reason = String(error?.message || "");
          if (reason) {
            setNotice(`地图依赖加载失败：${reason}`);
          } else {
            setNotice("地图依赖加载失败");
          }
        }
        return;
      }
      if (disposed || !chartHostRef.current) {
        setLoadingMapEngine(false);
        return;
      }
      setLoadingMapEngine(false);
      echarts.registerMap("china-super-map", mapGeoJson as any);
      echarts.registerMap(activeWorldMapName, activeWorldGeoJson as any);
      chart = echarts.init(chartHostRef.current, undefined, { renderer: "canvas" });
      chartRef.current = chart;
      setChartVersion((prev) => prev + 1);
      chart.on("click", (params: any) => {
        const region = String(params.name || "").trim();
        if (!region) return;
        if (!ensureCanEdit("登录后可高亮区域与保存地图配置")) return;
        setActiveRegionName(region);
        setSelectedNames((prev) =>
          prev.includes(region) ? prev.filter((name) => name !== region) : [...prev, region]
        );
      });
      chart.on("mouseover", (params: any) => {
        const region = String(params.name || "").trim();
        if (!region) return;
        setActiveRegionName(region);
      });
      chart.on("mouseout", () => {
        setActiveRegionName(null);
      });
      chart.on("globalout", () => {
        setActiveRegionName(null);
        setHoverCoord(null);
      });
      chart.on("georoam", () => {
        if (isMobile) {
          if (!mobileRoaming) setMobileRoaming(true);
          if (mobileRoamEndTimerRef.current) window.clearTimeout(mobileRoamEndTimerRef.current);
          mobileRoamEndTimerRef.current = window.setTimeout(() => {
            setMobileRoaming(false);
            setChartVersion((prev) => prev + 1);
          }, MOBILE_ROAM_LABEL_RESTORE_MS);
        }
        const option = chart.getOption() as any;
        const currentZoom = Number(option?.series?.[0]?.zoom);
        if (Number.isNaN(currentZoom)) return;
        const clampedZoom = Math.max(effectiveMinZoom, Math.min(effectiveMaxZoom, currentZoom));
        if (Math.abs(currentZoom - clampedZoom) > 0.001) {
          chart.setOption({ series: [{ zoom: clampedZoom }] });
        }
        setMapZoom((prev) => (Math.abs(prev - clampedZoom) > 0.001 ? clampedZoom : prev));
        if (mapScope === "world") {
          const center = (option?.series?.[0]?.center || [0, 10]) as [number, number];
          if (Array.isArray(center) && center.length === 2 && typeof center[0] === "number" && typeof center[1] === "number") {
            setWorldCenterLng((prev) => (Math.abs(prev - center[0]) > 0.001 ? center[0] : prev));
            setWorldCenterLat((prev) => (Math.abs(prev - center[1]) > 0.001 ? center[1] : prev));
          }
        } else {
          const center = (option?.series?.[0]?.center || [104, 36]) as [number, number];
          if (Array.isArray(center) && center.length === 2 && typeof center[0] === "number" && typeof center[1] === "number") {
            const midLng = 104;
            const midLat = 36;
            const maxLngShift = Math.min(30, 12 + (clampedZoom - 1) * 4);
            const maxLatShift = Math.min(20, 8 + (clampedZoom - 1) * 2.5);
            const clampedLng = Math.max(midLng - maxLngShift, Math.min(midLng + maxLngShift, center[0]));
            const clampedLat = Math.max(midLat - maxLatShift, Math.min(midLat + maxLatShift, center[1]));
            chart.setOption({ series: [{ center: [clampedLng, clampedLat] }] });
          }
        }
      });
      resizeObserverRef.current = new ResizeObserver(() => {
        chart.resize();
      });
      zr = chart.getZr();
      const onMouseMove = (event: any) => {
        const point = chart.convertFromPixel({ seriesIndex: 0 }, [event.offsetX, event.offsetY]) as any;
        if (Array.isArray(point) && point.length >= 2 && typeof point[0] === "number" && typeof point[1] === "number") {
          setHoverCoord([point[0], point[1]]);
        } else {
          setHoverCoord(null);
        }
      };
      const onMouseWheel = (event: any) => {
        const nativeEvent = event?.event;
        if (nativeEvent?.preventDefault) nativeEvent.preventDefault();
        if (nativeEvent?.stopPropagation) nativeEvent.stopPropagation();
        if (typeof event?.stop === "function") event.stop();

        const now = Date.now();
        if (now - lastWheelZoomAtRef.current < WHEEL_ZOOM_THROTTLE_MS) return;
        lastWheelZoomAtRef.current = now;

        const rawDelta =
          Number(nativeEvent?.wheelDelta) ||
          Number(nativeEvent?.deltaY ? -nativeEvent.deltaY : 0) ||
          Number(event?.wheelDelta) ||
          0;
        if (!rawDelta) return;

        const option = chart.getOption() as any;
        const currentZoom = Number(option?.series?.[0]?.zoom);
        if (!Number.isFinite(currentZoom)) return;

        const direction = rawDelta > 0 ? 1 : -1;
        const nextZoom =
          direction > 0
            ? currentZoom * WHEEL_ZOOM_STEP
            : currentZoom / WHEEL_ZOOM_STEP;
        const clampedZoom = Math.max(
          effectiveMinZoom,
          Math.min(effectiveMaxZoom, Number(nextZoom.toFixed(3)))
        );
        if (Math.abs(clampedZoom - currentZoom) < 0.001) return;

        chart.setOption({ series: [{ zoom: clampedZoom }] });
        setMapZoom((prev) => (Math.abs(prev - clampedZoom) > 0.001 ? clampedZoom : prev));
      };
      zr.on("mousemove", onMouseMove);
      zr.on("mousewheel", onMouseWheel);
      resizeObserverRef.current.observe(chartHostRef.current);
    };
    bootstrap();
    return () => {
      disposed = true;
      if (mobileRoamEndTimerRef.current) {
        window.clearTimeout(mobileRoamEndTimerRef.current);
        mobileRoamEndTimerRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      zr?.off?.("mousemove");
      zr?.off?.("mousewheel");
      chart?.dispose?.();
      chartRef.current = null;
    };
  }, [isOpen, mapGeoJson, activeWorldGeoJson, activeWorldMapName, mapScope, ensureCanEdit, chinaReady, activeWorldReady, effectiveMinZoom, effectiveMaxZoom, isMobile, mobileRoaming]);

  useEffect(() => {
    if (!isOpen || !isMobile || !isWeChatBrowser || !chartRef.current) return;
    const chart = chartRef.current;
    const refresh = () => {
      chart.resize();
      setChartVersion((prev) => prev + 1);
    };
    const timer = window.setTimeout(refresh, 80);
    window.addEventListener("orientationchange", refresh);
    window.visualViewport?.addEventListener("resize", refresh);
    window.visualViewport?.addEventListener("scroll", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("orientationchange", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("scroll", refresh);
    };
  }, [isOpen, isMobile, isWeChatBrowser, mapScope]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const activeGeoJson = mapScope === "world" ? activeWorldGeoJson : mapGeoJson;
    if (!Array.isArray((activeGeoJson as any)?.features) || (activeGeoJson as any).features.length === 0) return;
    const forcedWorldLabelNames = new Set(["France", "United Kingdom", "Spain"]);
    const getWorldDisplayName = (name: string, canonicalName: string) => {
      const runtimeZhName = worldMetaByName[normalizeWorldName(canonicalName)]?.zhName || worldMetaByName[normalizeWorldName(name)]?.zhName;
      const zhName = runtimeZhName || getWorldCountryZhName(canonicalName) || getWorldCountryZhName(name);
      return labelLanguage === "zh" ? (zhName || canonicalName) : canonicalName;
    };
    const shouldShowWorldLabel = (name: string, canonicalName: string) => {
      if (labelLanguage === "none") return false;
      if (isMobile && mobileRoaming) {
        return selectedSet.has(name) || forcedWorldLabelNames.has(canonicalName);
      }
      if (mapZoom <= MIN_MAP_ZOOM + 0.05) {
        return selectedSet.has(name) || forcedWorldLabelNames.has(canonicalName);
      }
      if (mapZoom < 1.15) {
        return selectedSet.has(name) || WORLD_LABEL_PRIORITY.has(canonicalName) || WORLD_LABEL_PRIORITY.has(name) || forcedWorldLabelNames.has(canonicalName);
      }
      return true;
    };
    const data = (activeGeoJson as any).features.map((feature: any) => {
      const name = String(feature.properties?.name || "");
      return {
        name,
        value: selectedSet.has(name) ? 1 : 0,
        itemStyle: {
          areaColor: selectedSet.has(name) ? highlightColor : baseColor
        }
      };
    });
    const worldCenter: [number, number] = [worldCenterLng, worldCenterLat];
    const currentOption = chart.getOption() as any;
    const currentChinaCenter = (currentOption?.series?.[0]?.center || [104, 36]) as [number, number];
    const chinaCenter =
      Array.isArray(currentChinaCenter) &&
      currentChinaCenter.length === 2 &&
      typeof currentChinaCenter[0] === "number" &&
      typeof currentChinaCenter[1] === "number"
        ? currentChinaCenter
        : [104, 36];
    const seriesConfig: any = {
      type: "map",
      map: mapScope === "world" ? activeWorldMapName : "china-super-map",
      roam: "move",
      zoom: mapZoom,
      aspectScale: mapScope === "world" ? 1 : 0.75,
      scaleLimit: {
        min: effectiveMinZoom,
        max: effectiveMaxZoom
      },
      selectedMode: false,
      label: {
        show: labelLanguage !== "none",
        color: fontColor,
        fontSize: isMobile ? Math.max(9, fontSize - 1) : fontSize,
        fontWeight,
        fontFamily,
        formatter: (params: any) => {
          const name = String(params.name || "");
          if (mapScope === "world") {
            const canonicalName = getWorldCountryCanonicalName(name);
            if (!shouldShowWorldLabel(name, canonicalName)) return "";
            return getWorldDisplayName(name, canonicalName);
          }
          if (isMobile && mobileRoaming) {
            return selectedSet.has(name) ? (labelLanguage === "zh" ? name : REGION_EN_MAP[name] || name) : "";
          }
          if (mapZoom <= MIN_MAP_ZOOM + 0.02) {
            if (!selectedSet.has(name)) return "";
          }
          return labelLanguage === "zh"
            ? name
            : REGION_EN_MAP[name] || name;
        }
      },
      labelLayout: {
        hideOverlap: isMobile ? true : mapScope === "world" ? worldFocusRegion === "ALL" : true
      },
      emphasis: {
        disabled: isMobile,
        label: { show: true, color: "#111827", fontWeight: 700, fontFamily },
        itemStyle: isMobile
          ? { areaColor: highlightColor, borderColor, borderWidth: 1.2 }
          : {
              areaColor: hoverColor,
              borderColor,
              borderWidth: 1.1,
              opacity: 0.98
            }
      },
      itemStyle: {
        areaColor: baseColor,
        borderColor: toRgba(borderColor, 0.92),
        borderWidth: 0.9,
        borderJoin: "round",
        borderCap: "round"
      },
      data
    };
    if (mapScope === "world") {
      seriesConfig.center = worldCenter;
    } else {
      seriesConfig.center = chinaCenter;
    }
    chart.setOption(
      {
        animation: false,
        series: [seriesConfig]
      },
      { notMerge: true }
    );
    const marineGraphicElements =
      mapScope === "world" && showMarineLabels
        ? marineLabelData
            .flatMap((item: any, index: number) => {
              const pixel = chart.convertToPixel({ seriesIndex: 0 }, item.coord) as any;
              if (!Array.isArray(pixel) || pixel.length < 2) return [];
              const x = Number(pixel[0]);
              const y = Number(pixel[1]);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
              const withinCanvas = x >= 0 && y >= 0 && x <= chart.getWidth() && y <= chart.getHeight();
              if (!withinCanvas) return [];
              const isStrait = item.value === "strait";
              const baseText = {
                id: `marine-label-${index}-${item.name}`,
                type: "text",
                left: x,
                top: y,
                silent: true,
                origin: [x, y],
                rotation: Number(item.rotation || 0),
                style: {
                  text: item.labelName,
                  font: isStrait
                    ? `${isMobile ? 10 : 11}px "Noto Serif SC","STKaiti","Times New Roman",serif`
                    : `${isMobile ? 11 : 12}px "Noto Serif SC","STKaiti","Times New Roman",serif`,
                  fontStyle: "italic",
                  fontWeight: isStrait ? 600 : 500,
                  fill: isStrait ? "rgba(30, 64, 175, 0.88)" : "rgba(37, 99, 235, 0.74)",
                  textAlign: "center",
                  textVerticalAlign: "middle"
                },
                z: 20
              };
              const highlighted = isStrait && activeMarineLabelName === item.name;
              if (!highlighted) return [baseText];
              const ring = {
                id: `marine-focus-ring-${index}-${item.name}`,
                type: "circle",
                shape: { cx: x, cy: y, r: isMobile ? 18 : 20 },
                silent: true,
                style: {
                  fill: "rgba(59,130,246,0.1)",
                  stroke: "rgba(37,99,235,0.92)",
                  lineWidth: 2
                },
                z: 19
              };
              return [ring, baseText];
            })
        : [];
    chart.setOption({
      graphic: marineGraphicElements
    });
  }, [chartVersion, selectedSet, labelLanguage, highlightColor, baseColor, borderColor, hoverColor, fontColor, fontSize, fontWeight, fontFamily, isMobile, mobileRoaming, mapZoom, mapGeoJson, activeWorldGeoJson, activeWorldMapName, mapScope, worldMetaByName, worldFocusRegion, worldCenterLng, worldCenterLat, effectiveMinZoom, effectiveMaxZoom, showMarineLabels, marineLabelData, activeMarineLabelName]);

  const saveImage = () => {
    if (!downloadChartImage(chartRef.current)) return;
    setNotice("图片已导出");
    window.setTimeout(() => setNotice(null), 1200);
  };

  const activeChinaProfile = activeRegionName ? PROVINCE_INFO[activeRegionName] : null;
  const worldCanonicalName = activeRegionName ? getWorldCountryCanonicalName(activeRegionName) : null;
  const worldGdpRankByName = useMemo(() => {
    const features = Array.isArray(worldGeoJson?.features) ? worldGeoJson.features : [];
    const uniqueRows: Record<string, { value: number }> = {};
    features.forEach((feature: any) => {
      const rawName = String(feature?.properties?.name || "");
      const canonical = getWorldCountryCanonicalName(rawName);
      const key = normalizeWorldName(canonical);
      const fallbackCountryId = getWorldCountryIdByName(canonical);
      const runtimeMeta = (fallbackCountryId && worldMetaByIso[fallbackCountryId]) || worldMetaByName[key];
      const countryId = runtimeMeta?.iso || fallbackCountryId;
      const gdpValue = (countryId && worldGdpByName[`__iso_${countryId}`]) || worldGdpByName[key];
      if (!Number.isFinite(gdpValue) || Number(gdpValue) <= 0) return;
      const rankKey = countryId ? `__iso_${countryId}` : key;
      const existing = uniqueRows[rankKey];
      if (!existing || Number(gdpValue) > existing.value) {
        uniqueRows[rankKey] = { value: Number(gdpValue) };
      }
    });
    const rows = Object.entries(uniqueRows)
      .map(([key, row]) => ({ key, value: row.value }))
      .sort((a, b) => b.value - a.value);
    const rankMap: Record<string, number> = {};
    rows.forEach((row, index) => {
      rankMap[row.key] = index + 1;
    });
    return rankMap;
  }, [worldGeoJson, worldMetaByIso, worldMetaByName, worldGdpByName]);
  const activeWorldProfile = useMemo(() => {
    if (!activeRegionName) return null;
    const base = getWorldCountryProfile(activeRegionName);
    const canonical = getWorldCountryCanonicalName(activeRegionName);
    const key = normalizeWorldName(canonical);
    const fallbackCountryId = getWorldCountryIdByName(canonical);
    const runtimeMeta = (fallbackCountryId && worldMetaByIso[fallbackCountryId]) || worldMetaByName[key];
    const countryId = runtimeMeta?.iso || fallbackCountryId;
    const gdpValue = (countryId && worldGdpByName[`__iso_${countryId}`]) || worldGdpByName[key];
    const populationText = runtimeMeta?.population ? formatPopulationByLang(runtimeMeta.population, labelLanguage) : base.population;
    const areaText = runtimeMeta?.area ? formatAreaByLang(runtimeMeta.area, labelLanguage) : base.area;
    const capitalEn = runtimeMeta?.capitalEn || base.capital;
    const localizedCapital = runtimeMeta?.capitalZh || getLocalizedWorldCapital(capitalEn, "zh");
    const hasLatin = /^[A-Za-z\s'.,-]+$/.test(localizedCapital);
    const capitalText = labelLanguage === "zh"
      ? (hasLatin ? "待补充" : localizedCapital)
      : capitalEn;
    if (!gdpValue) {
      return {
        ...base,
        capital: capitalText,
        area: areaText,
        population: populationText
      };
    }
    const rankKey = countryId ? `__iso_${countryId}` : key;
    return {
      ...base,
      capital: capitalText,
      area: areaText,
      population: populationText,
      gdp: `${(gdpValue / 1000000000000).toFixed(2)}万亿美元`,
      gdpRank: worldGdpRankByName[rankKey]
        ? String(worldGdpRankByName[rankKey])
        : worldGdpRankByName[key]
          ? String(worldGdpRankByName[key])
          : base.gdpRank
    };
  }, [activeRegionName, worldGdpByName, worldGdpRankByName, worldMetaByIso, worldMetaByName, labelLanguage]);
  const worldDisplayNameZh =
    (activeRegionName && worldMetaByName[normalizeWorldName(getWorldCountryCanonicalName(activeRegionName))]?.zhName) ||
    (activeRegionName && getWorldCountryZhName(activeRegionName)) ||
    (worldCanonicalName && worldMetaByName[normalizeWorldName(worldCanonicalName)]?.zhName) ||
    (worldCanonicalName && getWorldCountryZhName(worldCanonicalName)) ||
    null;
  const localizedWorldProfile = useMemo(() => {
    if (!activeWorldProfile) return null;
    if (labelLanguage !== "zh") return activeWorldProfile;
    return {
      ...activeWorldProfile,
      capital: getLocalizedWorldCapital(activeWorldProfile.capital, labelLanguage)
    };
  }, [activeWorldProfile, labelLanguage]);
  const activeRegionProfile = mapScope === "world" ? localizedWorldProfile : activeChinaProfile;
  const worldCurrentTime = useMemo(() => {
    if (mapScope !== "world") return null;
    const lng = hoverCoord?.[0] ?? worldCenterLng;
    return getWorldPointTimeInfo(activeRegionName, lng, timeTick).timeText;
  }, [mapScope, activeRegionName, hoverCoord, worldCenterLng, timeTick]);

  const worldTimezoneText = useMemo(() => {
    if (mapScope !== "world") return null;
    const lng = hoverCoord?.[0] ?? worldCenterLng;
    return getWorldPointTimeInfo(activeRegionName, lng, timeTick).timezoneText;
  }, [mapScope, activeRegionName, hoverCoord, worldCenterLng, timeTick]);
  const worldCoverage = useMemo(() => {
    const features = Array.isArray(worldGeoJson?.features) ? worldGeoJson.features : [];
    type WorldCoverageRow = {
      rawName: string;
      region: string;
      hasZh: boolean;
      hasCapital: boolean;
      hasPopulation: boolean;
      hasArea: boolean;
      hasGdp: boolean;
    };
    const rows: WorldCoverageRow[] = features.map((feature: any) => {
      const rawName = String(feature?.properties?.name || "");
      const canonical = getWorldCountryCanonicalName(rawName);
      const key = normalizeWorldName(canonical);
      const meta = worldMetaByName[key];
      const fallbackCountryId = getWorldCountryIdByName(canonical);
      const countryId = meta?.iso || fallbackCountryId;
      const base = getWorldCountryProfile(canonical);
      const regionRaw = String(meta?.region || "Unknown");
      const region = regionRaw === "Americas" ? "Americas" : (regionRaw || "Unknown");
      const hasZh = !!(meta?.zhName || getWorldCountryZhName(canonical));
      const hasCapital = !!(meta?.capitalEn || (base.capital && base.capital !== "待补充"));
      const hasPopulation = !!(meta?.population || (base.population && base.population !== "待补充"));
      const hasArea = !!(meta?.area || (base.area && base.area !== "待补充"));
      const hasGdp = !!((countryId && worldGdpByName[`__iso_${countryId}`]) || worldGdpByName[key] || (base.gdp && base.gdp !== "待补充"));
      return { rawName, region, hasZh, hasCapital, hasPopulation, hasArea, hasGdp };
    });
    const regions = ["ALL", "Africa", "Asia", "Europe", "Americas", "Oceania", "Unknown"];
    const byRegion: Record<string, any> = {};
    const calc = (subset: WorldCoverageRow[]) => {
      const total = subset.length || 1;
      const pick = (k: "hasZh" | "hasCapital" | "hasPopulation" | "hasArea" | "hasGdp") =>
        Math.round((subset.filter((row) => row[k]).length / total) * 100);
      const missing = subset
        .filter((row) => !(row.hasZh && row.hasCapital && row.hasPopulation && row.hasArea && row.hasGdp))
        .slice(0, 8)
        .map((row) => row.rawName);
      return {
        total: subset.length,
        zhPct: pick("hasZh"),
        capitalPct: pick("hasCapital"),
        populationPct: pick("hasPopulation"),
        areaPct: pick("hasArea"),
        gdpPct: pick("hasGdp"),
        missing
      };
    };
    byRegion.ALL = calc(rows);
    regions.slice(1).forEach((region) => {
      byRegion[region] = calc(rows.filter((row) => row.region === region));
    });
    return byRegion;
  }, [worldGeoJson, worldMetaByName, worldGdpByName]);
  const worldCoverageRegions = WORLD_COVERAGE_REGIONS;
  const activeWorldCoverage = worldCoverage[worldCoverageRegion] || worldCoverage.ALL || {
    total: 0,
    zhPct: 0,
    capitalPct: 0,
    populationPct: 0,
    areaPct: 0,
    gdpPct: 0,
    missing: []
  };

  const worldFocusRegions = WORLD_FOCUS_REGIONS;
  const currentWorldFocusLabel = worldFocusRegions.find((item) => item.key === worldFocusRegion)?.label || "全球";

  const switchWorldFocusRegionAction = useWorldFocusRegionSwitch({
    chartRef,
    mapScope,
    setWorldFocusRegion,
    setMapZoom,
    setWorldCenterLng,
    setWorldCenterLat,
    setMapScope,
    setShowWorldCoveragePanel,
    setShowScopeMenu
  });

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div
        className="relative w-full max-w-[1260px] h-[94vh] bg-white dark:bg-[#121212] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {resourceLoadingMessage ? (
          <div className="pointer-events-none absolute left-1/2 top-5 z-[110] -translate-x-1/2 rounded-full border border-[#2c3f78]/40 bg-[#101c44]/92 px-4 py-2 text-xs font-medium text-[#e9f0ff] shadow-[0_14px_32px_rgba(3,8,26,0.4)]">
            {resourceLoadingMessage}
          </div>
        ) : null}
        <div className="px-2 md:px-5 py-2 md:py-3 border-b border-gray-100 dark:border-[#333333] flex items-start md:items-center justify-between gap-1.5 md:gap-2">
          <div className="min-w-0 flex items-start gap-2 md:gap-3">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-[#060E9F] text-white flex items-center justify-center">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="text-[#151E32] dark:text-white font-semibold text-xs md:text-lg leading-none whitespace-nowrap">超级地图</div>
              <span className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 leading-none whitespace-nowrap">已选 {selectedNames.length} 个地区</span>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div ref={batchPanelRef} className="relative">
              <button
                onClick={() => {
                  setShowBatchPanel((prev) => !prev);
                  setShowSearchPanel(false);
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 md:px-2.5 md:py-2 rounded-md border border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] text-[11px] md:text-xs font-medium"
                title="批量选取"
              >
                <ListPlus className="w-4 h-4" />
                <span>批量选取</span>
              </button>
              {showBatchPanel && (
                <div className="absolute right-0 mt-1 z-50 w-[320px] rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#171717] shadow-xl p-3">
                  <div className="text-[11px] font-semibold text-[#060E9F] mb-1">{createScopeHint(mapScope)}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                    支持逗号、分号、空格、换行分隔。切换地图后匹配范围会同步切换。
                  </div>
                  <textarea
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    placeholder={mapScope === "china" ? "例如：北京市，青海省；广东 河北" : "例如：China, Japan；United States"}
                    className="w-full min-h-[92px] px-2 py-2 rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#0F0F0F] text-xs text-gray-700 dark:text-gray-200 outline-none resize-y"
                    autoFocus
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <label className="mr-auto inline-flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={batchAppendMode}
                        onChange={(e) => setBatchAppendMode(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#060E9F]"
                      />
                      仅追加到当前选中
                    </label>
                    <button
                      type="button"
                      onClick={() => setBatchInput("")}
                      className="px-2.5 py-1 rounded-md text-xs border border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      onClick={applyBatchSelection}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold border border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                    >
                      确认选择
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div ref={searchPanelRef} className="relative">
              <button
                onClick={() => {
                  setShowSearchPanel((prev) => !prev);
                  setShowBatchPanel(false);
                }}
                className="p-1.5 md:p-2 rounded-md border border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C]"
              >
                <Search className="w-4 h-4" />
              </button>
              {showSearchPanel && (
                <div className="absolute right-0 mt-1 z-50 w-[270px] rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#171717] shadow-xl p-2">
                  <input
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchResults.length > 0) {
                        applySearchResult(searchResults[0]);
                      }
                    }}
                    placeholder="搜索省份、国家、首都或海峡（至少 2 个字）"
                    className="w-full h-8 px-2 rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#0F0F0F] text-xs text-gray-700 dark:text-gray-200 outline-none"
                    autoFocus
                  />
                  <div className="mt-2 max-h-[220px] overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => applySearchResult(item)}
                          className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-700 dark:text-gray-200 hover:bg-[#060E9F]/10"
                        >
                          {item.label}
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                        {normalizedSearchKeyword.length >= 2 ? "没有找到匹配结果" : "请至少输入 2 个字"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {isMobile ? (
              <div className="relative">
                <button
                  onClick={() => setShowScopeMenu((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] md:text-xs font-semibold border border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F] whitespace-nowrap"
                >
                  <span>{mapScope === "world" ? "世界" : "中国"}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showScopeMenu ? "rotate-180" : ""}`} />
                </button>
                {showScopeMenu && (
                  <div className="absolute right-0 mt-1 z-40 rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#171717] shadow-lg p-1 min-w-[108px]">
                    <button
                      onClick={() => switchMapScope("china")}
                      className={`w-full text-left px-2 py-1 text-xs font-semibold rounded ${mapScope === "china" ? "bg-[#060E9F]/10 text-[#060E9F]" : "text-gray-700 dark:text-gray-200"}`}
                    >
                      中国地图
                    </button>
                    <button
                      onClick={() => switchMapScope("world")}
                      className={`w-full text-left px-2 py-1 text-xs font-semibold rounded ${mapScope === "world" ? "世界" : "中国"}`}
                    >
                      世界地图
                    </button>
                    {mapScope === "world" && (
                      <div className="mt-1 pt-1 border-t border-gray-100 dark:border-[#2a2a2a]">
                        {worldFocusRegions.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              switchWorldFocusRegionAction(item.key);
                              setShowScopeMenu(false);
                            }}
                            className={`w-full text-left px-2 py-1 text-xs rounded ${
                              worldFocusRegion === item.key ? "bg-[#060E9F]/10 text-[#060E9F]" : "text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => switchMapScope("china")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold border ${
                    mapScope === "china"
                      ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                      : "border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
                  }`}
                >
                  中国地图
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (mapScope !== "world") {
                        setMapScope("world");
                        setShowWorldCoveragePanel(true);
                        setShowWorldRegionMenu(true);
                        return;
                      }
                      setShowWorldRegionMenu((prev) => !prev);
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-semibold border inline-flex items-center gap-1 ${
                      mapScope === "world"
                        ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                        : "border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {mapScope === "world" ? `世界地图·${currentWorldFocusLabel}` : "世界地图"}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showWorldRegionMenu ? "rotate-180" : ""}`} />
                  </button>
                  {showWorldRegionMenu && (
                    <div className="absolute right-0 mt-1 z-40 rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#171717] shadow-lg p-1 min-w-[128px]">
                      {worldFocusRegions.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => {
                            switchWorldFocusRegionAction(item.key);
                            setShowWorldRegionMenu(false);
                          }}
                          className={`w-full text-left px-2 py-1 text-xs rounded ${
                            mapScope === "world" && worldFocusRegion === item.key ? "bg-[#060E9F]/10 text-[#060E9F]" : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#2C2C2C] dark:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {batchResult ? (
          <div className="absolute inset-0 z-[120] bg-black/35 flex items-center justify-center px-3">
            <div className="w-full max-w-[520px] rounded-xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#171717] shadow-2xl p-4">
              <div className="text-sm font-semibold text-[#151E32] dark:text-white">{createScopeSummaryTitle(batchResult.scope)}</div>
              <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                已选中 <span className="font-semibold text-[#060E9F]">{batchResult.matched.length}</span> 项
              </div>
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                模式：{batchResult.mode === "append" ? "追加" : "覆盖"}，当前总计：{batchResult.totalSelected} 项
              </div>
              <div className="mt-2 rounded-md border border-gray-200 dark:border-[#333333] p-2 max-h-[130px] overflow-y-auto text-xs text-gray-700 dark:text-gray-200">
                {batchResult.matched.length > 0 ? batchResult.matched.join("、") : "未匹配到任何区域。请确认当前地图模式与输入内容一致。"}
              </div>
              {batchResult.missing.length > 0 ? (
                <>
                  <div className="mt-3 text-xs text-gray-700 dark:text-gray-200">
                    未识别 <span className="font-semibold text-[#B45309]">{batchResult.missing.length}</span> 项
                  </div>
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/20 p-2 max-h-[110px] overflow-y-auto text-xs text-amber-800 dark:text-amber-300">
                    {batchResult.missing.join("、")}
                  </div>
                </>
              ) : null}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setBatchResult(null)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 relative bg-[#F8FAFC] dark:bg-[#0F0F0F]">
          <div ref={chartHostRef} className="absolute inset-0" />
          {((mapScope === "china" && !chinaReady) || (mapScope === "world" && !activeWorldReady)) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-300 bg-white/90 dark:bg-[#171717]/90 border border-gray-200 dark:border-[#333333]">
                地图加载中...
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
            <div className="mx-auto max-w-[1100px] rounded-xl bg-white/95 dark:bg-[#171717]/95 backdrop-blur border border-gray-200 dark:border-[#333333] shadow-lg px-2 py-2">
              <div ref={toolbarRef} className={`opacity-90 md:opacity-65 md:hover:opacity-100 transition-opacity duration-200 ${isMobile ? "flex flex-col gap-2" : "flex items-center gap-2 flex-wrap"}`}>
                <div className={`flex items-center gap-1.5 ${isMobile ? "self-start" : ""}`}>
                  <button
                    onClick={() =>
                      setLabelLanguage((prev) =>
                        prev === "zh" ? "en" : prev === "en" ? "none" : "zh"
                      )
                    }
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-[#333333] text-gray-700 dark:text-gray-200"
                  >
                    <Languages className="w-3 h-3" />
                    {labelLanguage === "zh" ? "EN" : labelLanguage === "en" ? "隐藏" : "中文"}
                  </button>
                  {mapScope === "world" && (
                    <button
                      onClick={() => setShowMarineLabels((prev) => !prev)}
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border ${
                        showMarineLabels
                          ? "border-[#2563EB] bg-[#2563EB]/10 text-[#1D4ED8]"
                          : "border-gray-200 dark:border-[#333333] text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {isMobile ? (showMarineLabels ? "海洋开" : "海洋关") : (showMarineLabels ? "隐藏海洋" : "显示海洋")}
                    </button>
                  )}
                </div>

                <div className={`${isMobile ? "grid grid-cols-4 gap-1.5" : "contents"}`}>
                  {[
                  { key: "theme", label: "主题" },
                  { key: "highlight", label: "高亮" },
                  { key: "base", label: "底色" },
                  { key: "border", label: "边界" },
                  { key: "hover", label: "Hover" },
                  { key: "fontWeight", label: "字重" },
                  { key: "fontSize", label: "字号" },
                  { key: "fontFamily", label: "字体" }
                  ].map((item) => (
                  <div key={item.key} className={`relative shrink-0 ${isMobile ? "min-w-0" : ""}`}>
                    <button
                      onClick={() => setActivePanel((prev) => (prev === item.key ? null : item.key))}
                      className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md border w-full ${
                        activePanel === item.key
                          ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F] dark:text-blue-300"
                          : "border-gray-200 dark:border-[#333333] text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {activePanel === item.key && (
                      <div className={`absolute bottom-full mb-2 z-30 rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#171717] shadow-xl px-2 py-2 whitespace-nowrap ${
                        isMobile ? "right-0" : item.key === "theme" ? "left-0" : "left-1/2 -translate-x-1/2"
                      }`}>
                        {item.key === "theme" && (
                          <div className="flex flex-col items-stretch gap-1">
                            {THEME_PRESETS.map((theme) => (
                              <button
                                key={theme.id}
                                onClick={() => applyThemeAction(theme.id)}
                                className={`h-7 px-2 rounded-md border text-[10px] inline-flex items-center gap-1 ${
                                  themeId === theme.id
                                    ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F] dark:text-blue-300"
                                    : "border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.highlightColor }} />
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.hoverColor }} />
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.baseColor }} />
                                <span>{theme.name}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {item.key === "fontWeight" && (
                          <div className="flex items-center gap-2 w-[180px]">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">350</span>
                            <input
                              type="range"
                              min={350}
                              max={800}
                              step={50}
                              value={fontWeight}
                              onChange={(e) => {
                                if (!ensureCanEdit("登录后可调整字体样式")) return;
                                setFontWeight(Number(e.target.value));
                              }}
                              className="flex-1 toolbar-slider"
                            />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{fontWeight}</span>
                          </div>
                        )}

                        {item.key === "fontSize" && (
                          <div className="flex items-center gap-2 w-[180px]">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">8</span>
                            <input
                              type="range"
                              min={8}
                              max={16}
                              step={0.25}
                              value={fontSize}
                              onChange={(e) => {
                                if (!ensureCanEdit("登录后可调整字体样式")) return;
                                setFontSize(Number(e.target.value));
                              }}
                              className="flex-1 toolbar-slider"
                            />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{fontSize.toFixed(2)}</span>
                          </div>
                        )}

                        {item.key === "fontFamily" && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {FONT_FAMILIES.map((family) => (
                                <button
                                  key={family.label}
                                  onClick={() => {
                                    if (!ensureCanEdit("登录后可切换字体")) return;
                                    setFontFamily(family.value);
                                  }}
                                  className={`h-7 px-2 rounded-md border text-xs ${
                                    fontFamily === family.value
                                      ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                                      : "border-gray-200 dark:border-[#333333] text-gray-700 dark:text-gray-200"
                                  }`}
                                >
                                  {family.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">颜色</span>
                              {FONT_COLOR_SWATCHES.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => {
                                    if (!ensureCanEdit("登录后可设置字体颜色")) return;
                                    setFontColor(color);
                                  }}
                                  className={`w-5 h-5 rounded border ${
                                    fontColor === color ? "border-[#111827] dark:border-white" : "border-gray-200 dark:border-[#333333]"
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                              <label className="h-7 px-2 rounded-md border border-gray-200 dark:border-[#333333] text-xs inline-flex items-center text-gray-700 dark:text-gray-200 cursor-pointer">
                                其他
                                <input
                                  type="color"
                                  value={fontColor}
                                  onChange={(e) => {
                                    if (!ensureCanEdit("登录后可设置字体颜色")) return;
                                    setFontColor(e.target.value);
                                  }}
                                  className="w-0 h-0 opacity-0"
                                />
                              </label>
                            </div>
                          </div>
                        )}

                        {item.key === "highlight" && (
                          <div className="flex items-center gap-2">
                            {COLOR_SWATCHES.highlight.map((color) => (
                              <button
                                key={color}
                                onClick={() => applyColorAction("highlight", color)}
                                className={`w-6 h-6 rounded border ${
                                  highlightColor === color ? "border-[#111827] dark:border-white" : "border-gray-200 dark:border-[#333333]"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <label className="h-7 px-2 rounded-md border border-gray-200 dark:border-[#333333] text-xs inline-flex items-center text-gray-700 dark:text-gray-200 cursor-pointer">
                              其他
                              <input
                                type="color"
                                value={highlightColor}
                                onChange={(e) => applyColorAction("highlight", e.target.value)}
                                className="w-0 h-0 opacity-0"
                              />
                            </label>
                          </div>
                        )}

                        {item.key === "base" && (
                          <div className="flex items-center gap-2">
                            {COLOR_SWATCHES.base.map((color) => (
                              <button
                                key={color}
                                onClick={() => applyColorAction("base", color)}
                                className={`w-6 h-6 rounded border ${
                                  baseColor === color ? "border-[#111827] dark:border-white" : "border-gray-200 dark:border-[#333333]"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <label className="h-7 px-2 rounded-md border border-gray-200 dark:border-[#333333] text-xs inline-flex items-center text-gray-700 dark:text-gray-200 cursor-pointer">
                              其他
                              <input
                                type="color"
                                value={baseColor}
                                onChange={(e) => applyColorAction("base", e.target.value)}
                                className="w-0 h-0 opacity-0"
                              />
                            </label>
                          </div>
                        )}

                        {item.key === "border" && (
                          <div className="flex items-center gap-2">
                            {COLOR_SWATCHES.border.map((color) => (
                              <button
                                key={color}
                                onClick={() => applyColorAction("border", color)}
                                className={`w-6 h-6 rounded border ${
                                  borderColor === color ? "border-[#111827] dark:border-white" : "border-gray-200 dark:border-[#333333]"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <label className="h-7 px-2 rounded-md border border-gray-200 dark:border-[#333333] text-xs inline-flex items-center text-gray-700 dark:text-gray-200 cursor-pointer">
                              其他
                              <input
                                type="color"
                                value={borderColor}
                                onChange={(e) => applyColorAction("border", e.target.value)}
                                className="w-0 h-0 opacity-0"
                              />
                            </label>
                          </div>
                        )}

                        {item.key === "hover" && (
                          <div className="flex items-center gap-2">
                            {COLOR_SWATCHES.hover.map((color) => (
                              <button
                                key={color}
                                onClick={() => applyColorAction("hover", color)}
                                className={`w-6 h-6 rounded border ${
                                  hoverColor === color ? "border-[#111827] dark:border-white" : "border-gray-200 dark:border-[#333333]"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <label className="h-7 px-2 rounded-md border border-gray-200 dark:border-[#333333] text-xs inline-flex items-center text-gray-700 dark:text-gray-200 cursor-pointer">
                              其他
                              <input
                                type="color"
                                value={hoverColor}
                                onChange={(e) => applyColorAction("hover", e.target.value)}
                                className="w-0 h-0 opacity-0"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  ))}
                </div>

                <div className={`flex items-center gap-2 ${isMobile ? "justify-between" : ""}`}>
                  <button
                    onClick={resetAllAction}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#2C2C2C] dark:text-gray-200 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    重置
                  </button>
                  <button
                    onClick={saveImage}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-500"
                  >
                    <Download className="w-3 h-3" />
                    导出图片
                  </button>
                </div>
                {notice && <span className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400">{notice}</span>}
              </div>
            </div>
          </div>

          {!isMobile && (
            <ZoomControl
              mapZoom={mapZoom}
              minZoom={effectiveMinZoom}
              maxZoom={effectiveMaxZoom}
              onChange={setMapZoom}
            />
          )}

          <ProvinceInfoCard
            regionName={
              mapScope === "world"
                ? (activeRegionName
                    ? (labelLanguage === "zh" ? worldDisplayNameZh || activeRegionName : activeRegionName)
                    : (labelLanguage === "en" ? "Ocean Area" : "海洋区域"))
                : activeRegionName
            }
            profile={activeRegionProfile}
            currentTime={mapScope === "world" ? worldCurrentTime : null}
            sourceText={mapScope === "world" ? `${WORLD_DATA_SOURCE_TEXT} · ${worldTimezoneText || "UTC"}` : undefined}
            titleLabel={
              mapScope === "world"
                ? (labelLanguage === "en"
                    ? (activeRegionName ? "Country" : "Location")
                    : (activeRegionName ? "国家" : "位置"))
                : "省份"
            }
            isWorld={mapScope === "world"}
            uiLanguage={labelLanguage}
          />
          {mapScope === "world" && showWorldCoveragePanel && (
            <div ref={worldCoveragePanelRef} className="absolute right-2 top-2 z-20 hidden md:block w-[250px] rounded-md border border-gray-200 dark:border-[#333333] bg-white/85 dark:bg-[#171717]/85 backdrop-blur px-2 py-2 text-[10px] text-gray-600 dark:text-gray-300">
              <div className="font-semibold text-[#151E32] dark:text-white">世界数据覆盖率</div>
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                {worldCoverageRegions.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setWorldCoverageRegion(item.key)}
                    className={`px-1.5 py-0.5 rounded border ${
                      worldCoverageRegion === item.key
                        ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                        : "border-gray-200 dark:border-[#333333] text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-1">
                <div>国家数：{activeWorldCoverage.total}</div>
                <div>中文名 {activeWorldCoverage.zhPct}% · 首都 {activeWorldCoverage.capitalPct}%</div>
                <div>人口 {activeWorldCoverage.populationPct}% · 面积 {activeWorldCoverage.areaPct}% · GDP {activeWorldCoverage.gdpPct}%</div>
                {activeWorldCoverage.missing.length > 0 && (
                  <div className="mt-0.5 text-gray-500 dark:text-gray-400 truncate">
                    待补样本：{activeWorldCoverage.missing.slice(0, 3).join(" / ")}
                  </div>
                )}
              </div>
              <div className="mt-1 text-[9px] text-gray-500 dark:text-gray-400">{WORLD_DATA_SOURCE_TEXT}</div>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        .zoom-slider,
        .toolbar-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 2px;
          background: rgba(15, 23, 42, 0.38);
          border-radius: 999px;
          outline: none;
        }
        .zoom-slider::-webkit-slider-thumb,
        .toolbar-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: transparent;
          border: 2px solid #060e9f;
        }
        .zoom-slider::-moz-range-thumb,
        .toolbar-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: transparent;
          border: 2px solid #060e9f;
        }
      `}</style>
    </div>,
    document.body
  );
}
