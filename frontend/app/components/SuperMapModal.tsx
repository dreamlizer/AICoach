"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Download, Languages, Paintbrush, Save, Search, Trash2, X } from "lucide-react";
import { DEFAULT_STATE, THEME_PRESETS, COLOR_SWATCHES, FONT_FAMILIES, FONT_COLOR_SWATCHES, MIN_MAP_ZOOM, MAX_MAP_ZOOM, REGION_EN_MAP, PROVINCE_INFO, WORLD_LABEL_PRIORITY, WORLD_DATA_SOURCE_TEXT, buildMapGeoJson, buildWorldGeoJson, getLocalizedWorldCapital, getWorldCountryCanonicalName, getWorldCountryIdByName, getWorldCountryProfile, getWorldCountryZhName, getWorldPointTimeInfo, loadChinaGeoJsonRemote, loadWorldGeoJsonRemote } from "./super-map/constants";
import { LabelLanguage, MapScope, PersistedState } from "./super-map/types";
import { ZoomControl } from "./super-map/ZoomControl";
import { ProvinceInfoCard } from "./super-map/ProvinceInfoCard";
import { AuthModal } from "./AuthModal";

type SuperMapModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | number;
};

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const int = parseInt(fullHex, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[.\-,'’()]/g, " ").replace(/\s+/g, " ").trim();
}

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

type WorldRuntimeMeta = {
  zhName?: string;
  capitalEn?: string;
  capitalZh?: string;
  population?: number;
  area?: number;
  iso?: string;
  region?: string;
};

type WorldFocusRegion = "ALL" | "Africa" | "Asia" | "Europe" | "NorthAmerica" | "SouthAmerica" | "Oceania";
type MarineLabelKind = "ocean" | "strait";
type MarineLabel = {
  name: string;
  coord: [number, number];
  kind: MarineLabelKind;
  scopes: WorldFocusRegion[];
  minZoom?: number;
  maxZoom?: number;
  rotation?: number;
};
type SearchItemType = "china_region" | "world_country" | "world_capital" | "marine";
type SearchItem = {
  key: string;
  label: string;
  type: SearchItemType;
  targetName: string;
  targetScope: MapScope;
  coord: [number, number] | null;
};

const SOUTH_AMERICA_COUNTRIES = new Set([
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Ecuador",
  "Guyana",
  "Paraguay",
  "Peru",
  "Suriname",
  "Uruguay",
  "Venezuela",
  "Falkland Islands",
  "French Guiana"
]);

const NORTH_AMERICA_COUNTRIES = new Set([
  "Canada",
  "United States of America",
  "Mexico",
  "Greenland",
  "Guatemala",
  "Belize",
  "Honduras",
  "El Salvador",
  "Nicaragua",
  "Costa Rica",
  "Panama",
  "Cuba",
  "Jamaica",
  "Haiti",
  "Dominican Republic",
  "The Bahamas",
  "Trinidad and Tobago",
  "Barbados",
  "Saint Lucia",
  "Antigua and Barbuda",
  "Dominica",
  "Saint Vincent and the Grenadines",
  "Grenada",
  "Puerto Rico"
]);

function getWorldFeaturesByRegion(region: WorldFocusRegion, sourceGeoJson: any, worldMetaByName: Record<string, WorldRuntimeMeta>) {
  const features = Array.isArray(sourceGeoJson?.features) ? sourceGeoJson.features : [];
  if (region === "ALL") return features;
  const primaryMatches = features.filter((feature: any) => {
    const rawName = String(feature?.properties?.name || "");
    const canonicalName = getWorldCountryCanonicalName(rawName);
    if (region === "NorthAmerica") return NORTH_AMERICA_COUNTRIES.has(canonicalName);
    if (region === "SouthAmerica") return SOUTH_AMERICA_COUNTRIES.has(canonicalName);
    const regionRaw = String(
      worldMetaByName[normalizeName(canonicalName)]?.region ||
        worldMetaByName[normalizeName(rawName)]?.region ||
        ""
    );
    const normalizedRegion = regionRaw === "Americas" ? "Americas" : regionRaw;
    return normalizedRegion === region;
  });
  if (primaryMatches.length > 0) return primaryMatches;
  if (Object.keys(worldMetaByName).length > 0) return primaryMatches;
  const fallbackBounds: Record<Exclude<WorldFocusRegion, "ALL">, { lng: [number, number]; lat: [number, number] }> = {
    Africa: { lng: [-25, 60], lat: [-38, 38] },
    Asia: { lng: [25, 180], lat: [-12, 80] },
    Europe: { lng: [-30, 65], lat: [32, 73] },
    NorthAmerica: { lng: [-170, -15], lat: [5, 84] },
    SouthAmerica: { lng: [-93, -30], lat: [-58, 16] },
    Oceania: { lng: [110, 180], lat: [-55, 10] }
  };
  const scope = fallbackBounds[region];
  return features.filter((feature: any) => {
    const cp = feature?.properties?.cp;
    if (!Array.isArray(cp) || cp.length < 2) return false;
    const lng = Number(cp[0]);
    const lat = Number(cp[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
    return lng >= scope.lng[0] && lng <= scope.lng[1] && lat >= scope.lat[0] && lat <= scope.lat[1];
  });
}

function extractCoordinates(geometry: any, collector: [number, number][]) {
  const walk = (value: any) => {
    if (!Array.isArray(value) || value.length === 0) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      collector.push([value[0], value[1]]);
      return;
    }
    value.forEach((item) => walk(item));
  };
  walk(geometry?.coordinates);
}

function getFeatureAnchor(feature: any): [number, number] | null {
  const cp = feature?.properties?.cp;
  if (
    Array.isArray(cp) &&
    cp.length >= 2 &&
    Number.isFinite(Number(cp[0])) &&
    Number.isFinite(Number(cp[1]))
  ) {
    return [Number(cp[0]), Number(cp[1])];
  }
  const points: [number, number][] = [];
  extractCoordinates(feature?.geometry, points);
  if (points.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  points.forEach((point) => {
    sumLng += point[0];
    sumLat += point[1];
  });
  return [sumLng / points.length, sumLat / points.length];
}

function computeWorldFocusCamera(
  features: any[],
  fallback: { center: [number, number]; zoom: number },
  minZoom: number,
  maxZoom: number
) {
  if (!Array.isArray(features) || features.length === 0) return fallback;
  const points: [number, number][] = [];
  features.forEach((feature) => {
    const anchor = getFeatureAnchor(feature);
    if (anchor) points.push(anchor);
  });
  if (points.length === 0) return fallback;
  const latitudes = points.map((point) => point[1]).filter((value) => Number.isFinite(value));
  if (latitudes.length === 0) return fallback;
  const lngValues = points.map((point) => point[0]).filter((value) => Number.isFinite(value));
  if (lngValues.length === 0) return fallback;

  const lngMinA = Math.min(...lngValues);
  const lngMaxA = Math.max(...lngValues);
  const lngSpanA = Math.max(1, lngMaxA - lngMinA);

  const shiftedLng = lngValues.map((value) => (value < 0 ? value + 360 : value));
  const lngMinB = Math.min(...shiftedLng);
  const lngMaxB = Math.max(...shiftedLng);
  const lngSpanB = Math.max(1, lngMaxB - lngMinB);
  const useShifted = lngSpanB < lngSpanA;

  const lngMin = useShifted ? lngMinB : lngMinA;
  const lngMax = useShifted ? lngMaxB : lngMaxA;
  const latMin = Math.min(...latitudes);
  const latMax = Math.max(...latitudes);
  const lngSpan = Math.max(6, lngMax - lngMin);
  const latSpan = Math.max(5, latMax - latMin);
  const centerLngRaw = (lngMin + lngMax) / 2;
  const centerLng = useShifted && centerLngRaw > 180 ? centerLngRaw - 360 : centerLngRaw;
  const centerLat = (latMin + latMax) / 2;
  const zoomByLng = 360 / (lngSpan * 1.25);
  const zoomByLat = 180 / (latSpan * 1.4);
  const zoom = Math.max(minZoom, Math.min(maxZoom, Number(Math.min(zoomByLng, zoomByLat).toFixed(2))));
  return {
    center: [Number(centerLng.toFixed(2)), Number(centerLat.toFixed(2))] as [number, number],
    zoom
  };
}

const WORLD_REGION_CAMERA: Record<WorldFocusRegion, { center: [number, number]; zoom: number }> = {
  ALL: { center: [0, 10], zoom: 1 },
  Africa: { center: [20, 5], zoom: 1.55 },
  Asia: { center: [95, 34], zoom: 1.45 },
  Europe: { center: [15, 52], zoom: 2.2 },
  NorthAmerica: { center: [-98, 45], zoom: 1.5 },
  SouthAmerica: { center: [-60, -17], zoom: 1.75 },
  Oceania: { center: [140, -22], zoom: 1.85 }
};

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

async function loadEchartsGlobal() {
  if (typeof window === "undefined") throw new Error("window is undefined");
  const existing = (window as any).echarts;
  if (existing?.init) return existing;
  const candidates = [
    "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js",
    "https://unpkg.com/echarts@5.6.0/dist/echarts.min.js",
    "https://cdn.bootcdn.net/ajax/libs/echarts/5.6.0/echarts.min.js"
  ];
  for (let index = 0; index < candidates.length; index += 1) {
    const scriptId = `echarts-cdn-script-${index}`;
    const src = candidates[index];
    const current = document.getElementById(scriptId) as HTMLScriptElement | null;
    try {
      if (!current) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`failed to load echarts from ${src}`));
          document.head.appendChild(script);
        });
      } else if (!(window as any).echarts?.init) {
        await new Promise<void>((resolve, reject) => {
          current.addEventListener("load", () => resolve(), { once: true });
          current.addEventListener("error", () => reject(new Error(`failed to load echarts from ${src}`)), { once: true });
          window.setTimeout(() => {
            if ((window as any).echarts?.init) resolve();
            else reject(new Error(`timeout loading echarts from ${src}`));
          }, 3500);
        });
      }
      if ((window as any).echarts?.init) break;
    } catch {
    }
  }
  const echarts = (window as any).echarts;
  if (!echarts?.init) throw new Error("echarts unavailable");
  return echarts;
}


export function SuperMapModal({ isOpen, onClose, userId }: SuperMapModalProps) {
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
  const [activeMarineLabelName, setActiveMarineLabelName] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(Date.now());
  const [worldGdpByName, setWorldGdpByName] = useState<Record<string, number>>({});
  const [worldMetaByName, setWorldMetaByName] = useState<Record<string, WorldRuntimeMeta>>({});
  const [worldMetaByIso, setWorldMetaByIso] = useState<Record<string, WorldRuntimeMeta>>({});
  const [worldCoverageRegion, setWorldCoverageRegion] = useState("ALL");
  const [worldFocusRegion, setWorldFocusRegion] = useState<WorldFocusRegion>("ALL");
  const [showMarineLabels, setShowMarineLabels] = useState(DEFAULT_STATE.showMarineLabels ?? true);
  const [showWorldCoveragePanel, setShowWorldCoveragePanel] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authHint, setAuthHint] = useState("登录后可高亮与编辑地图样式");
  const [chartVersion, setChartVersion] = useState(0);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const worldCoveragePanelRef = useRef<HTMLDivElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusRef = useRef<{ scope: MapScope; center: [number, number]; zoom: number; selectedName: string | null } | null>(null);

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
      const normalizedKey = normalizeName(canonical);
      if (worldByCanonical[normalizedKey]) return;
      worldByCanonical[normalizedKey] = { rawName, canonicalName: canonical, coord: getFeatureAnchor(feature) };
    });
    Object.values(worldByCanonical).forEach((item) => {
      const zhName =
        worldMetaByName[normalizeName(item.canonicalName)]?.zhName ||
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
      const capitalEn = worldMetaByName[normalizeName(item.canonicalName)]?.capitalEn || profile.capital;
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
  const ensureCanEdit = useCallback((hint: string) => {
    if (userId) return true;
    setAuthHint(hint);
    setShowAuthModal(true);
    return false;
  }, [userId]);
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
  }, []);
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
  }, []);
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
  }, [focusChinaRegion, focusWorldTarget]);

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
      try {
        const china = await loadChinaGeoJsonRemote();
        if (!cancelled) {
          setMapGeoJson(buildMapGeoJson(china));
        }
      } catch (error: any) {
        if (!cancelled) {
          setNotice(`中国地图数据加载失败：${String(error?.message || "unknown error")}`);
        }
      }
      try {
        const world = await loadWorldGeoJsonRemote();
        if (!cancelled) {
          setWorldGeoJson(buildWorldGeoJson(world));
        }
      } catch (error: any) {
        if (!cancelled) {
          setNotice(`世界地图数据加载失败：${String(error?.message || "unknown error")}`);
        }
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
    window.addEventListener("resize", updateDevice);
    return () => window.removeEventListener("resize", updateDevice);
  }, []);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
    if (!isOpen || mapScope !== "world") return;
    if (Object.keys(worldMetaByName).length > 0 && Object.keys(worldGdpByName).length > 0) return;
    let cancelled = false;
    const fetchSnapshot = async () => {
      try {
        const response = await fetch(`/geo/world-meta.snapshot.json?t=${Date.now()}`);
        if (!response.ok) return;
        const snapshot = await response.json();
        if (cancelled) return;
        const metaByName = snapshot?.worldMetaByName || {};
        const metaByIso = snapshot?.worldMetaByIso || {};
        const gdpByName = snapshot?.worldGdpByName || {};
        if (Object.keys(metaByName).length > 0 && Object.keys(worldMetaByName).length === 0) {
          setWorldMetaByName(metaByName);
        }
        if (Object.keys(metaByIso).length > 0 && Object.keys(worldMetaByIso).length === 0) {
          setWorldMetaByIso(metaByIso);
        }
        if (Object.keys(gdpByName).length > 0 && Object.keys(worldGdpByName).length === 0) {
          setWorldGdpByName(gdpByName);
        }
      } catch {
      }
    };
    fetchSnapshot();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mapScope, worldMetaByName, worldMetaByIso, worldGdpByName]);

  useEffect(() => {
    if (!isOpen || mapScope !== "world") return;
    if (Object.keys(worldGdpByName).length > 0) return;
    let cancelled = false;
    const fetchGdp = async () => {
      try {
        const response = await fetch(
          "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=20000"
        );
        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload[1] : [];
        const byName: Record<string, { year: number; value: number }> = {};
        (rows || []).forEach((row: any) => {
          const name = String(row?.country?.value || "").trim();
          const iso = String(row?.country?.id || "").toUpperCase();
          const value = Number(row?.value);
          const year = Number(row?.date || 0);
          if (!name || Number.isNaN(value) || value <= 0) return;
          const keys = [normalizeName(getWorldCountryCanonicalName(name))];
          if (iso.length === 2) keys.push(`__iso_${iso}`);
          keys.forEach((key) => {
            const prev = byName[key];
            if (!prev || year > prev.year) {
              byName[key] = { year, value };
            }
          });
        });
        if (cancelled) return;
        const result: Record<string, number> = {};
        Object.entries(byName).forEach(([key, row]) => {
          result[key] = row.value;
        });
        setWorldGdpByName(result);
      } catch {
      }
    };
    fetchGdp();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mapScope, worldGdpByName]);

  useEffect(() => {
    if (!isOpen || mapScope !== "world") return;
    if (Object.keys(worldMetaByName).length > 0) return;
    let cancelled = false;
    const fetchWorldMeta = async () => {
      const urls = [
        "https://restcountries.com/v3.1/all?fields=name,translations,capital,population,area,cca2,altSpellings,region",
        "https://restcountries.com/v2/all?fields=name,translations,capital,population,area,alpha2Code,region",
        "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json"
      ];
      const mergeEntity = (prev: WorldRuntimeMeta | undefined, next: WorldRuntimeMeta): WorldRuntimeMeta => ({
        zhName: prev?.zhName || next.zhName,
        capitalEn: prev?.capitalEn || next.capitalEn,
        capitalZh: prev?.capitalZh || next.capitalZh,
        population: prev?.population || next.population,
        area: prev?.area || next.area,
        iso: prev?.iso || next.iso,
        region: prev?.region || next.region
      });
      const byName: Record<string, WorldRuntimeMeta> = {};
      const byIso: Record<string, WorldRuntimeMeta> = {};
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const rows = await response.json();
          if (!Array.isArray(rows) || rows.length === 0) continue;
          rows.forEach((row: any) => {
            const hasV3Shape = typeof row?.name === "object" || !!row?.cca2;
            const enName = String(hasV3Shape ? row?.name?.common : row?.name || "").trim();
            const official = String(hasV3Shape ? row?.name?.official : "").trim();
            const iso = String(hasV3Shape ? row?.cca2 : row?.alpha2Code || "").toUpperCase();
            const capitalEn = String(hasV3Shape ? row?.capital?.[0] : row?.capital || "").trim();
            const translations = row?.translations || {};
            const zhName = String(
              (translations?.zho?.common || translations?.zho?.official || translations?.zh || translations?.cmn || "") || ""
            ).trim();
            const population = Number(row?.population);
            const area = Number(row?.area);
            const region = String(row?.region || "").trim();
            const entity = {
              zhName: zhName || undefined,
              capitalEn: capitalEn || undefined,
              capitalZh: capitalEn ? getLocalizedWorldCapital(capitalEn, "zh") : undefined,
              population: Number.isFinite(population) ? population : undefined,
              area: Number.isFinite(area) ? area : undefined,
              iso: iso || undefined,
              region: region || undefined
            };
            const nativeNames = Object.values(row?.name?.nativeName || {}).flatMap((item: any) => [item?.common, item?.official]);
            const names = [enName, official, ...(Array.isArray(row?.altSpellings) ? row.altSpellings : []), ...nativeNames]
              .map((name) => String(name || "").trim())
              .filter(Boolean);
            names.forEach((name) => {
              const key = normalizeName(getWorldCountryCanonicalName(name));
              byName[key] = mergeEntity(byName[key], entity);
            });
            if (iso.length === 2) byIso[iso] = mergeEntity(byIso[iso], entity);
          });
        } catch {
        }
      }
      if (!cancelled && Object.keys(byName).length > 0) {
        setWorldMetaByName(byName);
        setWorldMetaByIso(byIso);
      }
    };
    fetchWorldMeta();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mapScope, worldMetaByName]);

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
      try {
        echarts = await loadEchartsGlobal();
      } catch (error: any) {
        if (!disposed) {
          const reason = String(error?.message || "");
          if (reason) {
            setNotice(`地图依赖加载失败：${reason}`);
          } else {
            setNotice("地图依赖加载失败，请刷新后重试");
          }
        }
        return;
      }
      if (disposed || !chartHostRef.current) return;
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
      zr.on("mousemove", onMouseMove);
      resizeObserverRef.current.observe(chartHostRef.current);
    };
    bootstrap();
    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      zr?.off?.("mousemove");
      chart?.dispose?.();
      chartRef.current = null;
    };
  }, [isOpen, mapGeoJson, activeWorldGeoJson, activeWorldMapName, mapScope, ensureCanEdit, chinaReady, activeWorldReady, effectiveMinZoom, effectiveMaxZoom]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const activeGeoJson = mapScope === "world" ? activeWorldGeoJson : mapGeoJson;
    if (!Array.isArray((activeGeoJson as any)?.features) || (activeGeoJson as any).features.length === 0) return;
    const forcedWorldLabelNames = new Set(["France", "United Kingdom", "Spain"]);
    const getWorldDisplayName = (name: string, canonicalName: string) => {
      const runtimeZhName = worldMetaByName[normalizeName(canonicalName)]?.zhName || worldMetaByName[normalizeName(name)]?.zhName;
      const zhName = runtimeZhName || getWorldCountryZhName(canonicalName) || getWorldCountryZhName(name);
      return labelLanguage === "zh" ? (zhName || canonicalName) : canonicalName;
    };
    const shouldShowWorldLabel = (name: string, canonicalName: string) => {
      if (labelLanguage === "none") return false;
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
      roam: true,
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
          if (mapZoom <= MIN_MAP_ZOOM + 0.02) {
            if (!selectedSet.has(name)) return "";
          }
          return labelLanguage === "zh"
            ? name
            : REGION_EN_MAP[name] || name;
        }
      },
      labelLayout: {
        hideOverlap: mapScope === "world" ? worldFocusRegion === "ALL" : true
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
        borderColor: hexToRgba(borderColor, 0.92),
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
  }, [chartVersion, selectedSet, labelLanguage, highlightColor, baseColor, borderColor, hoverColor, fontColor, fontSize, fontWeight, fontFamily, isMobile, mapZoom, mapGeoJson, activeWorldGeoJson, activeWorldMapName, mapScope, worldMetaByName, worldFocusRegion, worldCenterLng, worldCenterLat, effectiveMinZoom, effectiveMaxZoom, showMarineLabels, marineLabelData, activeMarineLabelName]);

  const saveProgress = async () => {
    const payload: PersistedState = {
      selectedNames,
      labelLanguage,
      highlightColor,
      baseColor,
      borderColor,
      hoverColor,
      fontColor,
      fontSize,
      fontWeight,
      fontFamily,
      themeId,
      mapZoom,
      showMarineLabels
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    if (userId) {
      try {
        await fetch("/api/assessment/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "SUPER_MAP",
            title: "超级地图进度",
            result: selectedNames.join(", "),
            metadata: JSON.stringify(payload)
          })
        });
      } catch {
      }
    }
    setNotice("地图进度已保存");
    window.setTimeout(() => setNotice(null), 1200);
  };

  const saveImage = () => {
    if (!chartRef.current) return;
    const image = chartRef.current.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#ffffff"
    });
    const link = document.createElement("a");
    link.href = image;
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0");
    link.download = `超级地图(${timestamp}).png`;
    link.click();
    setNotice("图片已导出（所见即所得）");
    window.setTimeout(() => setNotice(null), 1200);
  };

  const applyTheme = (id: string) => {
    if (!ensureCanEdit("登录后可切换主题与样式")) return;
    const target = THEME_PRESETS.find((item) => item.id === id);
    if (!target) return;
    setThemeId(target.id);
    setHighlightColor(target.highlightColor);
    setBaseColor(target.baseColor);
    setBorderColor(target.borderColor);
    setHoverColor(target.hoverColor);
  };

  const applyColor = (type: "highlight" | "base" | "border" | "hover", color: string) => {
    if (!ensureCanEdit("登录后可自定义颜色与高亮")) return;
    setThemeId("custom");
    if (type === "highlight") setHighlightColor(color);
    if (type === "base") setBaseColor(color);
    if (type === "border") setBorderColor(color);
    if (type === "hover") setHoverColor(color);
  };

  const resetAll = () => {
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
  };

  const activeChinaProfile = activeRegionName ? PROVINCE_INFO[activeRegionName] : null;
  const worldCanonicalName = activeRegionName ? getWorldCountryCanonicalName(activeRegionName) : null;
  const worldGdpRankByName = useMemo(() => {
    const features = Array.isArray(worldGeoJson?.features) ? worldGeoJson.features : [];
    const uniqueRows: Record<string, { value: number }> = {};
    features.forEach((feature: any) => {
      const rawName = String(feature?.properties?.name || "");
      const canonical = getWorldCountryCanonicalName(rawName);
      const key = normalizeName(canonical);
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
    const key = normalizeName(canonical);
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
    (activeRegionName && worldMetaByName[normalizeName(getWorldCountryCanonicalName(activeRegionName))]?.zhName) ||
    (activeRegionName && getWorldCountryZhName(activeRegionName)) ||
    (worldCanonicalName && worldMetaByName[normalizeName(worldCanonicalName)]?.zhName) ||
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
      const key = normalizeName(canonical);
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
  const worldCoverageRegions = useMemo(() => ([
    { key: "ALL", label: "全部" },
    { key: "Africa", label: "非洲" },
    { key: "Asia", label: "亚洲" },
    { key: "Europe", label: "欧洲" },
    { key: "Americas", label: "美洲" },
    { key: "Oceania", label: "大洋洲" }
  ]), []);
  const activeWorldCoverage = worldCoverage[worldCoverageRegion] || worldCoverage.ALL || {
    total: 0,
    zhPct: 0,
    capitalPct: 0,
    populationPct: 0,
    areaPct: 0,
    gdpPct: 0,
    missing: []
  };

  const worldFocusRegions = useMemo(() => ([
    { key: "ALL" as WorldFocusRegion, label: "全球" },
    { key: "NorthAmerica" as WorldFocusRegion, label: "北美洲" },
    { key: "SouthAmerica" as WorldFocusRegion, label: "南美洲" },
    { key: "Europe" as WorldFocusRegion, label: "欧洲" },
    { key: "Africa" as WorldFocusRegion, label: "非洲" },
    { key: "Asia" as WorldFocusRegion, label: "亚洲" },
    { key: "Oceania" as WorldFocusRegion, label: "大洋洲" }
  ]), []);
  const currentWorldFocusLabel = worldFocusRegions.find((item) => item.key === worldFocusRegion)?.label || "全球";

  const switchWorldFocusRegion = useCallback((region: WorldFocusRegion) => {
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
  }, [mapScope]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div
        className="w-full max-w-[1260px] h-[94vh] bg-white dark:bg-[#121212] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 md:px-5 py-2.5 md:py-3 border-b border-gray-100 dark:border-[#333333] flex items-start md:items-center justify-between gap-2">
          <div className="min-w-0 flex items-start gap-2 md:gap-3">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-[#060E9F] text-white flex items-center justify-center">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="text-[#151E32] dark:text-white font-semibold text-sm md:text-lg leading-none whitespace-nowrap">超级地图</div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-none whitespace-nowrap">已选 {selectedNames.length} 个区域</span>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div ref={searchPanelRef} className="relative">
              <button
                onClick={() => setShowSearchPanel((prev) => !prev)}
                className="p-2 rounded-md border border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C]"
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
                    placeholder="输入国家/首都/省份/海峡（2字起）"
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
                        {normalizedSearchKeyword.length >= 2 ? "未找到匹配项" : "请输入至少2个字"}
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
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F] whitespace-nowrap"
                >
                  <span>{mapScope === "world" ? "世界地图" : "中国地图"}</span>
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
                      className={`w-full text-left px-2 py-1 text-xs font-semibold rounded ${mapScope === "world" ? "bg-[#060E9F]/10 text-[#060E9F]" : "text-gray-700 dark:text-gray-200"}`}
                    >
                      世界地图
                    </button>
                    {mapScope === "world" && (
                      <div className="mt-1 pt-1 border-t border-gray-100 dark:border-[#2a2a2a]">
                        {worldFocusRegions.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              switchWorldFocusRegion(item.key);
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
                            switchWorldFocusRegion(item.key);
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
                    {labelLanguage === "zh" ? "EN" : labelLanguage === "en" ? "不显示" : "中文"}
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
                      {isMobile ? (showMarineLabels ? "海洋关" : "海洋开") : (showMarineLabels ? "隐藏海洋标识" : "显示海洋标识")}
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
                  { key: "fontWeight", label: "粗细" },
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
                                onClick={() => applyTheme(theme.id)}
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
                                onClick={() => applyColor("highlight", color)}
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
                                onChange={(e) => applyColor("highlight", e.target.value)}
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
                                onClick={() => applyColor("base", color)}
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
                                onChange={(e) => applyColor("base", e.target.value)}
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
                                onClick={() => applyColor("border", color)}
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
                                onChange={(e) => applyColor("border", e.target.value)}
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
                                onClick={() => applyColor("hover", color)}
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
                                onChange={(e) => applyColor("hover", e.target.value)}
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
                    onClick={resetAll}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#2C2C2C] dark:text-gray-200 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    重置
                  </button>
                  <button
                    onClick={saveProgress}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#060E9F] text-white text-xs hover:bg-[#060E9F]/90"
                  >
                    <Save className="w-3 h-3" />
                    保存进度
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
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        floatingHint={authHint}
      />
    </div>,
    document.body
  );
}
