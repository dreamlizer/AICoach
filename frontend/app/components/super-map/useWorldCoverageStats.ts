"use client";

import { useMemo } from "react";
import {
  getLocalizedWorldCapital,
  getWorldCountryCanonicalName,
  getWorldCountryIdByName,
  getWorldCountryProfile,
  getWorldCountryZhName,
  getWorldPointTimeInfo
} from "./constants";
import { LabelLanguage, WorldCountryProfile, WorldFocusRegion, WorldRuntimeMeta } from "./types";
import { WORLD_COVERAGE_REGIONS, WORLD_FOCUS_REGIONS } from "./world-region-options";
import { normalizeName } from "./world-utils";

type CoverageStats = {
  total: number;
  zhPct: number;
  capitalPct: number;
  populationPct: number;
  areaPct: number;
  gdpPct: number;
  missing: string[];
};

type Params = {
  worldGeoJson: any;
  worldMetaByName: Record<string, WorldRuntimeMeta>;
  worldMetaByIso: Record<string, WorldRuntimeMeta>;
  worldGdpByName: Record<string, number>;
  activeRegionName: string | null;
  labelLanguage: LabelLanguage;
  mapScope: "china" | "world";
  hoverCoord: [number, number] | null;
  worldCenterLng: number;
  timeTick: number;
  worldCoverageRegion: string;
  worldFocusRegion: WorldFocusRegion;
};

function formatPopulation(value: number, language: LabelLanguage) {
  if (language === "en") return `${Math.round(value).toLocaleString()}`;
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${Math.round(value / 10000)}万`;
  return `${Math.round(value)}`;
}

function formatArea(value: number, language: LabelLanguage) {
  if (language === "en") return `${Math.round(value).toLocaleString()} km²`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万 km²`;
  return `${Math.round(value)} km²`;
}

function isPresent(value?: string) {
  return !!value && value !== "待补充";
}

export function useWorldCoverageStats(params: Params) {
  const {
    worldGeoJson,
    worldMetaByName,
    worldMetaByIso,
    worldGdpByName,
    activeRegionName,
    labelLanguage,
    mapScope,
    hoverCoord,
    worldCenterLng,
    timeTick,
    worldCoverageRegion,
    worldFocusRegion
  } = params;

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

  const activeWorldProfile = useMemo<WorldCountryProfile | null>(() => {
    if (!activeRegionName) return null;

    const base = getWorldCountryProfile(activeRegionName);
    const canonical = getWorldCountryCanonicalName(activeRegionName);
    const key = normalizeName(canonical);
    const fallbackCountryId = getWorldCountryIdByName(canonical);
    const runtimeMeta = (fallbackCountryId && worldMetaByIso[fallbackCountryId]) || worldMetaByName[key];
    const countryId = runtimeMeta?.iso || fallbackCountryId;
    const gdpValue = (countryId && worldGdpByName[`__iso_${countryId}`]) || worldGdpByName[key];

    const populationText = runtimeMeta?.population ? formatPopulation(runtimeMeta.population, labelLanguage) : base.population;
    const areaText = runtimeMeta?.area ? formatArea(runtimeMeta.area, labelLanguage) : base.area;
    const capitalEn = runtimeMeta?.capitalEn || base.capital;
    const localizedCapital = runtimeMeta?.capitalZh || getLocalizedWorldCapital(capitalEn, "zh");
    const hasLatin = /^[A-Za-z\s'.,-]+$/.test(localizedCapital);
    const capitalText = labelLanguage === "zh" ? (hasLatin ? "待补充" : localizedCapital) : capitalEn;

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
  }, [activeRegionName, labelLanguage, worldGdpByName, worldGdpRankByName, worldMetaByIso, worldMetaByName]);

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
    type WorldCoverageRow = {
      rawName: string;
      region: string;
      hasZh: boolean;
      hasCapital: boolean;
      hasPopulation: boolean;
      hasArea: boolean;
      hasGdp: boolean;
    };

    const features = Array.isArray(worldGeoJson?.features) ? worldGeoJson.features : [];
    const rows: WorldCoverageRow[] = features.map((feature: any) => {
      const rawName = String(feature?.properties?.name || "");
      const canonical = getWorldCountryCanonicalName(rawName);
      const key = normalizeName(canonical);
      const meta = worldMetaByName[key];
      const fallbackCountryId = getWorldCountryIdByName(canonical);
      const countryId = meta?.iso || fallbackCountryId;
      const base = getWorldCountryProfile(canonical);
      const regionRaw = String(meta?.region || "Unknown");
      const region = regionRaw === "Americas" ? "Americas" : regionRaw || "Unknown";
      const hasZh = !!(meta?.zhName || getWorldCountryZhName(canonical));
      const hasCapital = !!(meta?.capitalEn || isPresent(base.capital));
      const hasPopulation = !!(meta?.population || isPresent(base.population));
      const hasArea = !!(meta?.area || isPresent(base.area));
      const hasGdp = !!((countryId && worldGdpByName[`__iso_${countryId}`]) || worldGdpByName[key] || isPresent(base.gdp));
      return { rawName, region, hasZh, hasCapital, hasPopulation, hasArea, hasGdp };
    });

    const regions = ["ALL", "Africa", "Asia", "Europe", "Americas", "Oceania", "Unknown"];
    const byRegion: Record<string, CoverageStats> = {};
    const calc = (subset: WorldCoverageRow[]): CoverageStats => {
      const total = subset.length || 1;
      const pick = (k: keyof Omit<WorldCoverageRow, "rawName" | "region">) =>
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

  const activeWorldCoverage = worldCoverage[worldCoverageRegion] || worldCoverage.ALL || {
    total: 0,
    zhPct: 0,
    capitalPct: 0,
    populationPct: 0,
    areaPct: 0,
    gdpPct: 0,
    missing: []
  };

  const currentWorldFocusLabel =
    WORLD_FOCUS_REGIONS.find((item) => item.key === worldFocusRegion)?.label || "全球";

  return {
    localizedWorldProfile,
    worldDisplayNameZh,
    worldCurrentTime,
    worldTimezoneText,
    worldCoverageRegions: WORLD_COVERAGE_REGIONS,
    activeWorldCoverage,
    worldFocusRegions: WORLD_FOCUS_REGIONS,
    currentWorldFocusLabel
  };
}
