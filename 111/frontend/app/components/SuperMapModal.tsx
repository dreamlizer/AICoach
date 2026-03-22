"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as echarts from "echarts";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Languages, Paintbrush, Save, Trash2, X } from "lucide-react";
import { DEFAULT_STATE, THEME_PRESETS, COLOR_SWATCHES, FONT_FAMILIES, FONT_COLOR_SWATCHES, MIN_MAP_ZOOM, MAX_MAP_ZOOM, REGION_EN_MAP, PROVINCE_INFO, WORLD_LABEL_PRIORITY, WORLD_DATA_SOURCE_TEXT, buildMapGeoJson, buildWorldGeoJson, getWorldCountryCanonicalName, getWorldCountryIdByName, getWorldCountryProfile, getWorldCountryZhName, getWorldPointTimeInfo } from "./super-map/constants";
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

function clampWorldCenter(zoom: number, lng: number, lat: number) {
  const maxLng = Math.max(0, 180 - 180 / Math.max(zoom, 1));
  const maxLatOffset = Math.max(0, 110 - 110 / Math.max(zoom, 1));
  const baseLat = 10;
  const clampedLng = Math.max(-maxLng, Math.min(maxLng, lng));
  const clampedLat = Math.max(baseLat - maxLatOffset, Math.min(baseLat + maxLatOffset, lat));
  return [clampedLng, clampedLat] as [number, number];
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
  const [isMobile, setIsMobile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(Date.now());
  const [worldGdpByName, setWorldGdpByName] = useState<Record<string, number>>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authHint, setAuthHint] = useState("登录后可高亮与编辑地图样式");
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number | null>(null);

  const storageKey = useMemo(() => `super_map_state_${userId || "guest"}_${mapScope}`, [userId, mapScope]);
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const mapGeoJson = useMemo(() => buildMapGeoJson(), []);
  const worldGeoJson = useMemo(() => buildWorldGeoJson(), []);
  const shiftWorldCenter = useCallback((deltaLng: number, deltaLat = 0) => {
    if (mapZoom <= 1) return;
    const [nextLng, nextLat] = clampWorldCenter(mapZoom, worldCenterLng + deltaLng, worldCenterLat + deltaLat);
    setWorldCenterLng(nextLng);
    setWorldCenterLat(nextLat);
  }, [mapZoom, worldCenterLng, worldCenterLat]);
  const ensureCanEdit = useCallback((hint: string) => {
    if (userId) return true;
    setAuthHint(hint);
    setShowAuthModal(true);
    return false;
  }, [userId]);

  useEffect(() => {
    setMounted(true);
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
  }, [isOpen, mapScope]);

  useEffect(() => {
    if (!isOpen || mapScope !== "world" || !chartHostRef.current) return;
    const host = chartHostRef.current;
    const onPointerDown = (event: PointerEvent) => {
      dragStartXRef.current = event.clientX;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragStartXRef.current === null) return;
      if (mapZoom <= 1) return;
      const deltaX = event.clientX - dragStartXRef.current;
      const movementY = event.movementY || 0;
      const xSteps = Math.floor(Math.abs(deltaX) / 40);
      if (xSteps >= 1) {
        const shift = 8 * xSteps;
        if (deltaX < 0) {
          shiftWorldCenter(shift, 0);
        } else {
          shiftWorldCenter(-shift, 0);
        }
        dragStartXRef.current = event.clientX;
      }
      if (Math.abs(movementY) >= 3) {
        shiftWorldCenter(0, movementY < 0 ? -8 : 8);
      }
    };
    const onPointerUp = () => {
      dragStartXRef.current = null;
    };
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointerleave", onPointerUp);
    return () => {
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointerleave", onPointerUp);
    };
  }, [isOpen, mapScope, mapZoom, shiftWorldCenter]);

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
    }
  }, [isOpen, storageKey, isMobile]);

  useEffect(() => {
    if (!isOpen || !chartHostRef.current) return;
    echarts.registerMap("china-super-map", mapGeoJson as any);
    echarts.registerMap("world-super-map", worldGeoJson as any);
    const chart = echarts.init(chartHostRef.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    chart.on("click", (params) => {
      const region = String(params.name || "").trim();
      if (!region) return;
      if (!ensureCanEdit("登录后可高亮区域与保存地图配置")) return;
      setActiveRegionName(region);
      setSelectedNames((prev) =>
        prev.includes(region) ? prev.filter((name) => name !== region) : [...prev, region]
      );
    });
    chart.on("mouseover", (params) => {
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
      const clampedZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, currentZoom));
      if (Math.abs(currentZoom - clampedZoom) > 0.001) {
        chart.setOption({ series: [{ zoom: clampedZoom }] });
      }
      setMapZoom((prev) => (Math.abs(prev - clampedZoom) > 0.001 ? clampedZoom : prev));
      if (mapScope === "world") {
        const center = (option?.series?.[0]?.center || [worldCenterLng, worldCenterLat]) as [number, number];
        if (Array.isArray(center) && center.length === 2 && typeof center[0] === "number") {
          const [lng, lat] = clampWorldCenter(clampedZoom, center[0], Number(center[1] || worldCenterLat));
          setWorldCenterLng(lng);
          setWorldCenterLat(lat);
          chart.setOption({ series: [{ center: [lng, lat] }] });
        }
      } else {
        const center = (option?.series?.[0]?.center || [104, 36]) as [number, number];
        if (Array.isArray(center) && center.length === 2 && typeof center[0] === "number" && typeof center[1] === "number") {
          const midLng = 104;
          const midLat = 36;
          const halfLng = 31 / Math.max(clampedZoom, 1);
          const halfLat = 18 / Math.max(clampedZoom, 1);
          const maxLng = Math.max(0, 31 - halfLng);
          const maxLat = Math.max(0, 18 - halfLat);
          const clampedLng = Math.max(midLng - maxLng, Math.min(midLng + maxLng, center[0]));
          const clampedLat = Math.max(midLat - maxLat, Math.min(midLat + maxLat, center[1]));
          chart.setOption({ series: [{ center: [clampedLng, clampedLat] }] });
        }
      }
    });
    resizeObserverRef.current = new ResizeObserver(() => {
      chart.resize();
    });
    const zr = chart.getZr();
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
    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      zr.off("mousemove", onMouseMove);
      chart.dispose();
      chartRef.current = null;
    };
  }, [isOpen, mapGeoJson, worldGeoJson, mapScope, worldCenterLng, worldCenterLat, ensureCanEdit]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const activeGeoJson = mapScope === "world" ? worldGeoJson : mapGeoJson;
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
    chart.setOption(
      {
        animation: false,
        series: [
          {
            type: "map",
            map: mapScope === "world" ? "world-super-map" : "china-super-map",
            roam: mapScope === "world" ? "scale" : true,
            zoom: mapZoom,
            center: mapScope === "world" ? [worldCenterLng, worldCenterLat] : [104, 36],
            aspectScale: mapScope === "world" ? 1 : 0.75,
            scaleLimit: {
              min: MIN_MAP_ZOOM,
              max: MAX_MAP_ZOOM
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
                  let zhName = getWorldCountryZhName(canonicalName) || getWorldCountryZhName(name);
                  const displayName = labelLanguage === "zh" ? (zhName || "") : canonicalName;
                  if (labelLanguage === "none") return "";
                  if (mapZoom < 0.9) {
                    return selectedSet.has(name) ? displayName : "";
                  }
                  if (mapZoom < 1.05) {
                    return selectedSet.has(name) || WORLD_LABEL_PRIORITY.has(canonicalName) || WORLD_LABEL_PRIORITY.has(name) ? displayName : "";
                  }
                  return displayName;
                }
                return labelLanguage === "zh"
                  ? name
                  : REGION_EN_MAP[name] || name;
              }
            },
            labelLayout: {
              hideOverlap: true
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
          }
        ]
      },
      { notMerge: true }
    );
  }, [selectedSet, labelLanguage, highlightColor, baseColor, borderColor, hoverColor, fontColor, fontSize, fontWeight, fontFamily, isMobile, mapZoom, mapGeoJson, worldGeoJson, mapScope, worldCenterLng, worldCenterLat]);

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
      mapZoom
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
    setMapZoom(isMobile ? 0.95 : DEFAULT_STATE.mapZoom);
    setWorldCenterLng(0);
    setWorldCenterLat(10);
    setActivePanel(null);
  };

  const activeChinaProfile = activeRegionName ? PROVINCE_INFO[activeRegionName] : null;
  const worldCanonicalName = activeRegionName ? getWorldCountryCanonicalName(activeRegionName) : null;
  const worldGdpRankByName = useMemo(() => {
    const rows = Object.entries(worldGdpByName).sort((a, b) => b[1] - a[1]);
    const rankMap: Record<string, number> = {};
    rows.forEach(([key], index) => {
      rankMap[key] = index + 1;
    });
    return rankMap;
  }, [worldGdpByName]);
  const activeWorldProfile = useMemo(() => {
    if (!activeRegionName) return null;
    const base = getWorldCountryProfile(activeRegionName);
    const canonical = getWorldCountryCanonicalName(activeRegionName);
    const key = normalizeName(canonical);
    const countryId = getWorldCountryIdByName(canonical);
    const gdpValue = (countryId && worldGdpByName[`__iso_${countryId}`]) || worldGdpByName[key];
    if (!gdpValue) return base;
    return {
      ...base,
      gdp: `${(gdpValue / 1000000000000).toFixed(2)}万亿美元`,
      gdpRank: worldGdpRankByName[key] ? String(worldGdpRankByName[key]) : base.gdpRank
    };
  }, [activeRegionName, worldGdpByName, worldGdpRankByName]);
  const worldDisplayNameZh =
    (activeRegionName && getWorldCountryZhName(activeRegionName)) ||
    (worldCanonicalName && getWorldCountryZhName(worldCanonicalName)) ||
    null;
  const activeRegionProfile = mapScope === "world" ? activeWorldProfile : activeChinaProfile;
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

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div
        className="w-full max-w-[1260px] h-[94vh] bg-white dark:bg-[#121212] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 md:px-5 py-3 border-b border-gray-100 dark:border-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-[#060E9F] text-white flex items-center justify-center">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div className="text-[#151E32] dark:text-white font-semibold text-base md:text-lg">超级地图</div>
            <span className="text-xs text-gray-500 dark:text-gray-400">已选 {selectedNames.length} 个区域</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMapScope("china");
                setActiveRegionName(null);
                setSelectedNames([]);
                setWorldCenterLng(0);
                setWorldCenterLat(10);
              }}
              className={`px-2 py-1 rounded-md text-xs border ${
                mapScope === "china"
                  ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                  : "border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
              }`}
            >
              中国地图
            </button>
            <button
              onClick={() => {
                setMapScope("world");
                setActiveRegionName(null);
                setSelectedNames([]);
                setMapZoom(1);
                setWorldCenterLng(0);
                setWorldCenterLat(10);
              }}
              className={`px-2 py-1 rounded-md text-xs border ${
                mapScope === "world"
                  ? "border-[#060E9F] bg-[#060E9F]/10 text-[#060E9F]"
                  : "border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
              }`}
            >
              世界地图
            </button>
            {mapScope === "world" && (
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => shiftWorldCenter(-15)}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => shiftWorldCenter(15)}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-[#333333] text-gray-600 dark:text-gray-300"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
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

          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
            <div className="mx-auto max-w-[1100px] rounded-xl bg-white/95 dark:bg-[#171717]/95 backdrop-blur border border-gray-200 dark:border-[#333333] shadow-lg px-2 py-2">
              <div ref={toolbarRef} className="flex items-center gap-2 flex-wrap opacity-65 hover:opacity-100 transition-opacity duration-200">
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
                  <div key={item.key} className="relative shrink-0">
                    <button
                      onClick={() => setActivePanel((prev) => (prev === item.key ? null : item.key))}
                      className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border ${
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
                        item.key === "theme" ? "left-0" : "left-1/2 -translate-x-1/2"
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
                  保存
                </button>
                <button
                  onClick={saveImage}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-500"
                >
                  <Download className="w-3 h-3" />
                  导图
                </button>
                {notice && <span className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400">{notice}</span>}
              </div>
            </div>
          </div>

          {!isMobile && (
            <ZoomControl
              mapZoom={mapZoom}
              minZoom={MIN_MAP_ZOOM}
              maxZoom={MAX_MAP_ZOOM}
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
          {mapScope === "world" && (
            <div className="absolute bottom-2 right-2 z-20 text-[10px] text-gray-500 dark:text-gray-400 bg-white/75 dark:bg-[#171717]/75 backdrop-blur px-2 py-1 rounded-md">
              {WORLD_DATA_SOURCE_TEXT}
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
